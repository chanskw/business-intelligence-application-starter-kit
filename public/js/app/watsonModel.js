(function(app) {
  'use strict';
  app.WatsonModel = function() {
    this.data = null;

    this.description = null;
    this.displayName = null;

    this._pendingRequests = [];

    this.configureModel({
      start: -5,
      end: 0,
      entity: null
    });
  };


  app.WatsonModel.TIME_LIMIT = -60;

  app.WatsonModel.prototype._isTimeWithinLimit = function(time) {
    return time >= app.WatsonModel.TIME_LIMIT && time <= 0;
  };

  app.WatsonModel.prototype.abort = function() {
    this._pendingRequests.forEach(function(pendingRequest) {
      pendingRequest.abort();
    });
    this._pendingRequests = [];
  };

  app.WatsonModel.prototype.validateTime = function(start, end) {
    var isValidTime = this._isTimeWithinLimit(start) && this._isTimeWithinLimit(end);
    isValidTime = isValidTime && (start <= end);
    return isValidTime;
  };

  app.WatsonModel.prototype._convertOptionsToQuery = function(options, queryStr) {
    if (!queryStr) {
      queryStr = '';
    }
    var sep = queryStr.length ? '&' : '';

    for (var attr in options) {
      if (options.hasOwnProperty(attr)) {
        queryStr += sep + encodeURIComponent(attr) + '=';
        queryStr += encodeURIComponent(options[attr]);
        sep = '&';
      }
    }
    return queryStr;
  };

  app.WatsonModel.prototype._generateTimeStr = function(time) {
    return time ? ('now' + time + 'd') : 'now';
  };

  app.WatsonModel.prototype._createRequestURL = function(baseUrl, options) {
    var queryStr = this._convertOptionsToQuery(options);
    var defaultQueryOptions = {
      entity: this.entity,
      start: this._generateTimeStr(this.start),
      end: this._generateTimeStr(this.end),
    };
    queryStr = this._convertOptionsToQuery(defaultQueryOptions, queryStr);
    if (queryStr.length) {
      queryStr = '?' + queryStr;
    }
    return baseUrl + queryStr;
  };

  app.WatsonModel.prototype._removePendingRequest = function(req) {
    var index = this._pendingRequests.indexOf(req);
    if (index !== -1) {
      this._pendingRequests.splice(index, 1);
    }
  };

  app.WatsonModel.prototype._sendRequest = function(url, options) {
    var requestURL = this._createRequestURL(url, options);
    var self = this;
    return new Promise(function(resolve, reject) {

      var req = new XMLHttpRequest();

      req.addEventListener('load', function() {
        self._removePendingRequest(req);
        if (this.status >= 200 && this.status < 300) {
          var responseObj = JSON.parse(this.responseText);
          resolve(responseObj);
        } else {
          reject(this);
        }
      });

      req.open('GET', requestURL, true);
      req.send();
      self._pendingRequests.push(req);
    });




  };


  app.WatsonModel.prototype._getSourceId = function(source) {
    var prefix = 'www.';
    var sourceProcessed = source;
    if (source.indexOf(prefix) !== -1) {
      sourceProcessed = source.substring(prefix.length);
    }
    var indexOfSep = sourceProcessed.indexOf('.');
    if (indexOfSep !== -1) {
      sourceProcessed = sourceProcessed.substring(0, indexOfSep);
    }
    return sourceProcessed;
  };

  app.WatsonModel.prototype._fetchTones = function(articles) {
    var self = this;
    return new Promise(function(resolve, reject) {
      var tonePromises = [];
      articles.forEach(function(article) {
        if (!article.tone) {
          tonePromises.push(self._sendRequest(self._getServiceURL('tone'), {
            url: article.url
          }));
        }
      });
      Promise.all(tonePromises).then(function(results) {
        articles.forEach(function(article, articleIndex) {
          article.tone = results[articleIndex];
        });
        resolve(resolve);
      }).catch(function(reason) {
        reject(reason);
      });
    });
  };

  app.WatsonModel.prototype.fetchArticles = function(sourceObj) {
    var self = this;
    var articleLimit = 3;
    return new Promise(function(resolve, reject) {
      if (!sourceObj.articles) {

        self._sendRequest(self._getServiceURL('articles'), {
            source: sourceObj.sourceId
          }).then(function(responseArticles) {
            sourceObj._totalArticles = responseArticles.length;
            sourceObj.articles = responseArticles.splice(0, articleLimit);
            var startDelete = responseArticles.length > articleLimit ?
              (responseArticles.length - articleLimit) : 0;
            sourceObj.articles.push.apply(sourceObj.articles,
              responseArticles.splice(startDelete));
            sourceObj._articleBoundary = articleLimit;
            self._fetchTones(sourceObj.articles).then(function() {
              resolve(sourceObj.articles);
            }).catch(function(reason) {
              reject(reason);
            });

          })
          .catch(function(reason) {
            reject(reason);
          });
      } else {
        resolve(sourceObj.articles);
      }
    });
  };

  app.WatsonModel.prototype.fetchKeywordSentiments = function(keywordObj) {

    var self = this;
    var sentiments = ['positive', 'negative'];
    return new Promise(function(resolve, reject) {
      var sentimentPromises = [];
      if (!keywordObj.sentiments) {
        sentiments.forEach(function(sentiment) {
          var sentimentPromise = self._sendRequest(self._getServiceURL('keywords'), {
            keyword: keywordObj.keyword,
            sentiment: sentiment,
            slice: '1d'
          });
          sentimentPromises.push(sentimentPromise);
        });
        Promise.all(sentimentPromises).then(function(responses) {
            keywordObj.sentiments = {};
            sentiments.forEach(function(sentiment, index) {
              keywordObj.sentiments[sentiment] = responses[index];
            });
            resolve(keywordObj.sentiments);
          })
          .catch(function(reason) {
            reject(reason);
          });
      } else {
        resolve(keywordObj.sentiments);
      }
    });
  };



  app.WatsonModel.prototype.fetchKeywords = function() {

    var keywordsPromise = this._sendRequest(this._getServiceURL('keywords'), {
      count: 10
    });
    var self = this;
    return new Promise(function(resolve, reject) {
      keywordsPromise.then(function(results) {
          var keywordCountPromises = [];
          results.forEach(function(result) {
            keywordCountPromises.push(self._sendRequest(self._getServiceURL('keywords'), {
              keyword: result.keyword
            }));
          });
          Promise.all(keywordCountPromises).then(function(countResponses) {
            results.forEach(function(result, index) {
              result.count = countResponses[index].count;
              result.label = result.keyword.replace(/(?!IBM\b)\b\w+/g,
                function(text) {
                  return text.charAt(0).toUpperCase() + text.substring(1).toLowerCase();
                });
              console.log(result.label);
            });
            results.sort(function(item1, item2) {
              return item2.count - item1.count;
            });
            self.data.keywords = results;
            resolve(self.data.keywords);
          }).catch(function(reason) {
            reject(reason);
          });
        })
        .catch(function(reason) {
          reject(reason);
        });
    });

  };

  app.WatsonModel.prototype._fetchActualCount = function(sourceObj) {
    var actualCountPromise = this._sendRequest(this._getServiceURL('sources'), {
      source: sourceObj.sourceId
    });
    return new Promise(function(resolve, reject) {
      actualCountPromise.then(function(actualCountObj) {
        sourceObj.count = actualCountObj.count;
        resolve(sourceObj);
      }).catch(function(reason) {
        reject(reason);
      });
    });
  };

  app.WatsonModel.prototype.fetchTopSources = function() {

    var topSourcePromise = this._sendRequest(this._getServiceURL('sources'), {
      count: 3
    });
    var self = this;
    return new Promise(function(resolve, reject) {
      topSourcePromise.then(function(responses) {
          self.data.topSources = responses;
          var childPromises = [];
          responses.forEach(function(responseSource) {
            responseSource.sourceId = self._getSourceId(responseSource.source);
            childPromises.push(self._fetchActualCount(responseSource));
            childPromises.push(self.fetchSourceSentiment(responseSource));
          });
          Promise.all(childPromises).then(function() {
            resolve(self.data.topSources);
          }).catch(function(reason) {
            reject(reason);
          });
        })
        .catch(function(reason) {
          reject(reason);
        });
    });

  };

  app.WatsonModel.prototype.fetchCoreInfo = function() {
    var self = this;
    return new Promise(function(resolve, reject) {
      Promise.all([
          self.fetchSentiment(),
          self.fetchTopSources()
        ]).then(function() {
          resolve(self);
        })
        .catch(function(reason) {
          reject(reason);
        });
    });
  };

  app.WatsonModel.prototype.fetchSentiment = function() {
    var sentiments = ['positive', 'negative', 'neutral'];
    var promises = [];
    sentiments.forEach(function(sentiment) {
      promises.push(this._sendRequest(this._getServiceURL('sentiment'), {
        sentiment: sentiment
      }));
    }, this);
    var self = this;
    return new Promise(function(resolve, reject) {
      Promise.all(promises).then(function(responses) {
          self.data.sentiments = {};
          sentiments.forEach(function(sentiment, index) {
            self.data.sentiments[sentiment] = responses[index];
          }, this);
          resolve(self.data.sentiments);
        })
        .catch(function(reason) {
          reject(reason);
        });
    });
  };

  //TODO: merge this with fetchSentiment
  app.WatsonModel.prototype.fetchSourceSentiment = function(sourceObj) {
    var sentiments = ['positive', 'negative', 'neutral'];
    var promises = [];
    sentiments.forEach(function(sentiment) {
      promises.push(this._sendRequest(this._getServiceURL('sources'), {
        sentiment: sentiment,
        source: sourceObj.sourceId
      }));
    }, this);
    return new Promise(function(resolve, reject) {
      Promise.all(promises).then(function(responses) {
          sourceObj.sentiments = {};
          sentiments.forEach(function(sentiment, index) {
            sourceObj.sentiments[sentiment] = responses[index];
          }, this);
          resolve(sourceObj.sentiments);
        })
        .catch(function(reason) {
          reject(reason);
        });
    });
  };

  app.WatsonModel.prototype._getServiceURL = function(path) {
    return '/' + window.globalProperties.serviceEndpoint + '/' + path;
  };

  app.WatsonModel.prototype.configureModel = function(defaultOptions) {
    var date = new Date();
    date.setHours(0, 0, 0, 0);
    this.updateDate = date.getTime();
    this.entity = defaultOptions.entity;
    this.start = defaultOptions.start;
    this.end = defaultOptions.end;
    this.data = {};

  };


})(window.app || (window.app = {}));
