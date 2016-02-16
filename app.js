/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var express = require('express'),
  app       = express(),
  urlParse  = require('url'),
  extend    = require('util')._extend,
  watson    = require('watson-developer-cloud'),
  Q         = require('q');

// Bootstrap application settings
require('./config/express')(app);

var toneAnalyzer = watson.tone_analyzer({
  username: '<username>',
  password: '<password>',
  version: 'v2-experimental'
});

var alchemyApiKey = { api_key: process.env.ALCHEMY_API_KEY || '<your api key>'};
var alchemyLanguage = watson.alchemy_language(alchemyApiKey);
var alchemyDataNews = watson.alchemy_data_news(alchemyApiKey);

var extractText = Q.nfbind(alchemyLanguage.text.bind(alchemyLanguage));
var getTone = Q.nfbind(toneAnalyzer.tone.bind(toneAnalyzer));
var getNews = Q.nfbind(alchemyDataNews.getNews.bind(alchemyDataNews));

function entityQuery(entity) {
  return '\|text=' + entity + ',type=company,relevance=>0.25\|';
}

function keywordSentiment(keyword, sentiment) {
  return '\|text=' + keyword +
    (sentiment ? ',sentiment.type=' + sentiment : '') +
    ',relevance=>0.7\|';
}
app.get('/api/sentiment', function (req, res, next) {
  var params = {
    start: req.query.start,
    end: req.query.end,
    slice: req.query.slice,
    'q.enriched.url.docSentiment.type': req.query.sentiment,
    'q.enriched.url.enrichedTitle.entities.entity' : entityQuery(req.query.entity),
  };

  getNews(params).then(function(news) {
    return res.json(news.result);
  })
  .catch(next);
 });

app.get('/api/keywords', function (req, res, next) {
  var params = {
    start: req.query.start,
    end: req.query.end,
    'q.enriched.url.enrichedTitle.entities.entity' : entityQuery(req.query.entity)
  };

  if (req.query.count) {
    var countParams = extend(params, {
      count: 300,
      'q.enriched.url.keywords.keyword.text' : req.query.keyword,
      return: 'q.enriched.url.keywords.keyword.text,q.enriched.url.keywords.keyword.sentiment.score,enriched.url.keywords.keyword.relevance'
    });

    getNews(countParams).then(function(news){
      var docs = news.result.docs || [];
      var keywordsMap = {};

      docs.forEach(function(doc){
        if (doc.source.enriched != undefined){
          var keywords = doc.source.enriched.url.keywords || [];
          keywords.forEach(function(keyword){
            var key = keyword.text.toUpperCase();
            if (keyword.relevance > 0.7) {
              if (keywordsMap[key]) {
                keywordsMap[key].score += keyword.sentiment.score;
                keywordsMap[key].count += 1;
              } else {
                keywordsMap[key] = {
                  keyword: key,
                  score: keyword.sentiment.score,
                  count: 1
                };
              }
            }
          });
        }
        else {
          console.log(JSON.stringify(doc, null, 4));
        }
      });

      var sortedKeywords = Object.keys(keywordsMap)
      .map(function(key) {
        keywordsMap[key].score = keywordsMap[key].score / keywordsMap[key].count;
        return keywordsMap[key];
      })
      .sort(function(a, b) {
        return b.count - a.count;
      });

      res.json(sortedKeywords.slice(0, req.query.count));
    })
    .catch(next);
  } else if (req.query.keyword) {
    var keywordParams = extend(params, {
      'q.enriched.url.keywords.keyword' : keywordSentiment(req.query.keyword, req.query.sentiment),
      timeslice: req.query.slice
    });

    getNews(keywordParams).then(function(news){
      return res.json(news.result);
    })
    .catch(next);
  } else {
    next(new Error('At this point I don\'t know what to do and I\'m to afraid to ask.'));
  }
});

app.get('/api/sources', function (req, res, next) {
  var params = {
    start: req.query.start,
    end: req.query.end,
    'q.enriched.url.enrichedTitle.entities.entity' : entityQuery(req.query.entity)
  };

  if (req.query.count) {
    var keywordParams = extend(params, {
      count: 1000,
      'q.enriched.url.keywords.keyword.text' : req.query.keyword,
      return: 'q.enriched.url.url'
    });

    getNews(keywordParams).then(function(news) {
      var docs = news.result.docs || [];
      var sourceMap = {};

      docs.map(function(doc){
        var url = doc.source.enriched.url.url;
        if (url) {
          var host = urlParse.parse(url).hostname;
          if (sourceMap[host])
            sourceMap[host].count += 1;
          else
            sourceMap[host] = { source: host, count: 1};
        }
      });

      var sortedSources = Object.keys(sourceMap)
      .map(function(key) {
        return sourceMap[key];
      })
      .sort(function(a, b) {
        return b.count - a.count;
      });

      var size = Math.min(req.query.count, sortedSources.length);
      res.json(sortedSources.slice(0, size));
    })
    .catch(next);
  } else if (req.query.source) {
    var sourceParams = extend(params, {
      'q.enriched.url.url': req.query.source,
      'q.enriched.url.docSentiment.type': req.query.sentiment,
      timeslice: req.query.slice
    });

    getNews(sourceParams).then(function(news) {
      res.json(news.result);
    })
    .catch(next);
  } else {
    next(new Error('At this point I don\'t know what to do and I\'m to afraid to ask.'));
  }
});


app.get('/api/articles', function (req, res, next) {
  var params = {
    count: req.query.count || 1000,
    start: req.query.start,
    end: req.query.end,
    return: 'q.enriched.url.title,q.enriched.url.url,enriched.url.docSentiment.score',
    'q.enriched.url.enrichedTitle.entities.entity':
      '\|text=' + req.query.entity + ',type=company,relevance=>0.25\|',
    'q.enriched.url.url': req.query.source
  };

  getNews(params).then(function(news){
    var docs = news.result.docs || [];
    var sortedDocs = docs.map(function(doc) {
      doc.title = doc.source.enriched.url.title;
      doc.url = doc.source.enriched.url.url;
      doc.score = doc.source.enriched.url.docSentiment.score;
      return doc;
    })
    .sort(function(a, b) {
      return b.score - a.score;
    });
    res.json(sortedDocs);
  })
  .catch(next);
});

app.get('/api/tone', function (req, res, next) {
   extractText({url : req.query.url}) // get the text from a url
   .then(function(result){
     return getTone({text: result.text}).then(function(tone){
       res.json(tone[0]);
     });
   })
   .catch(next);
 });

// error-handler settings
require('./config/error-handler')(app);

var port = process.env.VCAP_APP_PORT || 6001;
app.listen(port);
console.log('listening at:', port);
