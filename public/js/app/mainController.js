(function(app) {
  'use strict';
  app.MainController = function(model) {
    this.model = model;
    this.widgets = [];

    window.addEventListener('hashchange', this.handleHash.bind(this), false);
    this._showLoader(false);
    this._initializeControlFields();
    this._initScrollFixSupport();

  };

  app.MainController.prototype._initScrollFixSupport = function() {
    var datePickerContainer = document.getElementById('date-picker-container');
    var header = document.getElementById('details-header');
    var isFixed = false;
    //TODO: Use scrollHeight to calculate the correct offsets.
    // Need to recalculate when the page resizes
    var triggerPageOffset = 140;
    window.addEventListener('scroll', function() {
      var pageOffset = window.pageYOffset;
      if (pageOffset > triggerPageOffset) {
        if (!isFixed) {
          isFixed = true;
          header.style.minHeight = header.scrollHeight + 'px';
          datePickerContainer.classList.add('fixed-date-container');
        }
      } else {
        if (isFixed) {
          isFixed = false;
          datePickerContainer.classList.remove('fixed-date-container');
          header.style.minHeight = '';
        }
      }

    });
  };


  app.MainController.prototype.handleHash = function() {
    var hash = window.location.hash;
    if (hash.length) {
      hash = hash.substring(1);
      var params = hash.split('&');
      var start = null,
        end = null,
        entity = null;
      params.forEach(function(param) {
        var tokens = param.split('=');
        if (tokens.length > 1) {
          var value = decodeURIComponent(tokens[1]);
          switch (tokens[0]) {
            case 'entity':
              if (value.length) {
                entity = value;
              }
              break;
            case 'start':
              start = value;
              break;
            case 'end':
              end = value;
              break;
            default:
          }
        }
      });
      var procStart = null,
        procEnd = null;
      if (start !== null && end !== null) {
        try {
          var startInt = parseInt(start);
          var endInt = parseInt(end);
          if (this.model.validateTime(startInt, endInt)) {
            procStart = startInt;
            procEnd = endInt;
          }
        } catch (e) {
          //ignore
        }
      }

      if (procStart !== null && procEnd !== null && entity !== null) {
        this.model.configureModel({
          entity: entity,
          start: procStart,
          end: procEnd
        });
        this.model.abort();
        var promise = this.model.fetchCoreInfo();
        this._showLoader(true);
        promise.then(function() {
            this._showLoader(false);

            //TODO: Check the description url instead
            var totalSentiment = 0;
            var sentiments = this.model.data.sentiments;
            Object.keys(sentiments).forEach(function(sentiment) {
              totalSentiment += sentiments[sentiment].count;
            });
            if (totalSentiment) {
              try {
                this._showDetailsPage();
              } catch (e) {
                console.error('An error occurred while displaying the details page.');
                console.error(e);
              }
            } else {
              window.alert('No data available for entity ' + this.model.entity);
            }
          }.bind(this))
          .catch(
            function(reason) {
              this._showLoader(false);
              window.alert('Unable to retrieve answers from Watson. \n\n Status: ' +
                reason.status + ', Message: ' + reason.responseText);
            }.bind(this)
          );
      } else {
        window.location.hash = '';
      }
    } else {
      this._changeSections(false);
    }

  };


  app.MainController.prototype._showLoader = function(doShow) {
    var loaderContainer = document.getElementById('watson-loader-container');
    loaderContainer.style.display = doShow ? '' : 'none';

    var mainBody = document.getElementById('body-main');
    mainBody.style.overflow = doShow ? 'hidden' : '';

    var datePicker = document.getElementById('date-picker-container');
    datePicker.style.display = doShow ? 'none' : '';

    var entityInput = document.getElementById('details-entity-input');
    entityInput.disabled = doShow;
  };
  app.MainController.prototype._addInputListeners = function(id, callback) {
    var entityInput = document.getElementById(id);

    entityInput.onkeypress = function(e) {
      //on enter
      if (e.keyCode === 13) {
        var inputValue = entityInput.value;
        if (inputValue.trim().length) {
          callback(inputValue);
        } else {
          window.alert('Please enter an entity name.');
        }
        return true;
      }
    };
  };

  app.MainController.prototype._initializeControlFields = function() {
    this._addInputListeners('welcome-entity-input', function(inputValue) {
      this.model.entity = inputValue;
      this.handleModelChanges();
    }.bind(this));

    this._addInputListeners('details-entity-input', function(inputValue) {
      this.model.entity = inputValue;
      this.handleModelChanges();
    }.bind(this));


    this.datePicker = new app.DatePicker(this._createDummyContainer('date-picker-container'));
    this.datePicker.onDateChange = function(start, end) {
      this.model.start = start;
      this.model.end = end;
      this.handleModelChanges();
    }.bind(this);
  };


  app.MainController.prototype._changeSections = function(doShowDetailsSection) {

    var welcomeSection = document.getElementById('welcome-section');
    welcomeSection.style.display = doShowDetailsSection ? 'none' : '';
    if (!doShowDetailsSection) {
      var detailsEntityInput = document.getElementById('header-search-container');
      detailsEntityInput.style.display = 'none';

      var welcomeEntityInput = document.getElementById('welcome-entity-input');
      welcomeEntityInput.value = '';
      welcomeEntityInput.focus();
    }

    var detailsSection = document.getElementById('details-section');
    detailsSection.style.display = doShowDetailsSection ? '' : 'none';

    //TODO: try to make this work with pure css
    var bodyMain = document.getElementById('body-main');
    bodyMain.style.display = doShowDetailsSection ? 'block' : '';
  };



  app.MainController.prototype.handleModelChanges = function() {
    var hashObj = {
      entity: this.model.entity,
      start: this.model.start,
      end: this.model.end,
    };
    //convert obj to hash str
    var hashStr = this.model._convertOptionsToQuery(hashObj);
    window.location.hash = '#' + hashStr;
  };



  app.MainController.prototype._createDummyContainer = function(parentId) {
    var container = document.createElement('div');
    var parent = document.getElementById(parentId);
    parent.appendChild(container);
    return container;
  };

  app.MainController.prototype._showDetailsPage = function() {

    this.datePicker.setDays(this.model.start, this.model.end);

    if (this._articleTable) {
      this._articleTable.remove();
    }

    this.widgets.forEach(function(widgetToRemove) {
      if (widgetToRemove && widgetToRemove.remove) {
        widgetToRemove.remove();
      }
    });

    this.widgets = [];
    /*widgets.keywordsTable = new app.KeywordsTable(this._createDummyContainer('#keywords-table'));
    widget.keywordsTable.loadData();*/

    var displayName = this.model.displayName !== null ? this.model.displayName : this.model.entity;
    //prepare header
    document.getElementById('details-entity-input').value = this.model.entity;
    document.getElementById('header-search-container').style.display = '';

    //prepare decription/time banner
    var detailsEntityTitle = document.getElementById('details-entity-title');
    detailsEntityTitle.innerHTML = displayName;

    var description = this.model.description;
    var descriptionDiv = document.getElementById('entity-description');
    descriptionDiv.innerHTML = description ? description : '';

    var topSourceBoxes = new app.TopSourceBoxes(
      this._createDummyContainer('top-sources-container'), this.model.data);
    this.widgets.push(topSourceBoxes);

    var cachedSource = null;

    topSourceBoxes.onClickHandle = function(source) {

      if (cachedSource !== source) {
        cachedSource = source;
        if (this._articleTable) {
          this._articleTable.remove();
        }
        if (source !== null) {
          var articleListContainer = document.getElementById('article-list-container');
          articleListContainer.innerHTML = 'Loading Articles...';
          this.model.fetchArticles(source).then(function() {
            articleListContainer.innerHTML = '';
            this._articleTable = new app.ArticleTable(
              this._createDummyContainer('article-list-container'), {
                model: this.model,
                source: source
              });
          }.bind(this)).catch(function(error) {
            window.alert('An error occurred while fetching articles');
            console.error(error);
          });
        }
      }
    }.bind(this);

    this.widgets.push(new app.SentimentBalls(
      this._createDummyContainer('customer-sentiment-container'), this.model.data));

    var topicsLoadingContainer = document.getElementById('topics-loading-container');

    var topicsDetailContainer = document.getElementById('topics-details-container');


    topicsLoadingContainer.style.display = '';
    topicsDetailContainer.style.display = 'none';

    var fetchKeywordsPromise = this.model.fetchKeywords();

    var header = document.getElementById('details-header');

    fetchKeywordsPromise.then(function() {

      var topicsChart = new app.TopicsBallChart(
          this._createDummyContainer('topic-chart-container'), this.model.data),
        topicsTable = new app.TopicsTable(this._createDummyContainer('topic-list-container'), {
          model: this.model
        });

      this.widgets.push(topicsTable);
      this.widgets.push(topicsChart);

      topicsChart.onClickHandle = function(data) {
        var selectedElem = topicsTable.selectTopic(data);
        if (selectedElem) {
          var boundingRect = selectedElem.getBoundingClientRect();
          var elemYDistance = boundingRect.top + window.pageYOffset - header.scrollHeight;
          window.scroll(0, elemYDistance);
        }
      };

      topicsLoadingContainer.style.display = 'none';
      topicsDetailContainer.style.display = '';
    }.bind(this));

    this._changeSections(true);
  };


})(window.app || (window.app = {}));
