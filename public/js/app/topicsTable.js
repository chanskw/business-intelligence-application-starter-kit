(function(app) {
  'use strict';
  app.TopicsTable = function(dom, args) {
    this.domNode = dom;

    this.model = args.model;

    this._setup();
    this.loadData(this.model.data.keywords);
  };

  app.TopicsTable.TABLE_COLUMNS = [{
    label: 'Topic',
    prop: 'label',
    colSpan: 2
  }, {
    label: 'Count of Mentions',
    prop: 'count'
  }, {
    label: 'Sentiment',
    prop: 'score'
  }];

  app.TopicsTable.prototype.remove = function() {
    this.domNode.remove();
  };

  app.TopicsTable.prototype.selectTopic = function(data) {
    var tbody = this._table.selectAll('tbody')
      .filter(function(d) {
        return d === data;
      });
    var selectionRows = tbody.select('.keyword-row');
    //there should only be one item but lets make sure
    var isItemSelected = false,
      romDomNode = null;
    selectionRows.each(function() {
      if (!isItemSelected) {
        var row = d3.select(this);
        row.on('click').apply(this, arguments);
        romDomNode = row.node();
        isItemSelected = true;
      }
    });
    return romDomNode;
  };

  app.TopicsTable.prototype._setup = function() {
    var table = this._table = d3.select(this.domNode)
      .append('table').attr('class', 'keywords-table-container');

    table.append('thead')
      .append('tr')
      .selectAll('th')
      .data(app.TopicsTable.TABLE_COLUMNS).enter()
      .append('th')
      .attr('colspan', function(d) {
        return d.colSpan ? d.colSpan : 1;
      })
      .classed('keyword-heading', true)
      .text(function(d) {
        return d.label;
      });
  };

  app.TopicsTable.prototype.loadData = function(data) {

    var indexOfSentiment = 2;
    var model = this.model;
    //TODO: do not modify the model obj. Instead have a temporary metadata obj which
    //stores divs
    var rowGroupSelection = this._table.selectAll('tbody')
      .data(data).enter()
      .append('tbody');
    var row = rowGroupSelection.append('tr')
      .classed('keyword-row', true)
      .on('click', function(d) {
        var carrotDiv = d3.select(d._carrotDiv);
        if (!d._dummyDiv) {
          var dummyDiv = d._dummyDiv = document.createElement('div');
          dummyDiv.innerHTML = 'Loading Sentiment...';

          d._graphDiv.appendChild(dummyDiv);
          d._graphDiv.style.display = 'flex';

          carrotDiv.classed('carrot-expanded', true);

          var sentimentPromise = model.fetchKeywordSentiments(d);
          var row = this;
          sentimentPromise.then(function() {
            //incase row is closed before the response comes back
            if (d._dummyDiv) {
              dummyDiv.innerHTML = '';
              dummyDiv.className = 'sentiment-chart-container';
              row._sentimentLineChart = new app.SentimentLineChart(dummyDiv, {
                model: model,
                sentiments: d.sentiments
              });
            }
          });
        } else {
          d._graphDiv.style.display = 'none';
          this._sentimentLineChart.remove();
          this._sentimentLineChart = null;
          d._dummyDiv = null;

          carrotDiv.classed('carrot-expanded', false);
        }
      });

    rowGroupSelection.append('tr')
      .append('td')
      //include the carrot's columns
      .attr('colspan', app.TopicsTable.TABLE_COLUMNS.length + 1)
      .append('div')
      .each(function(d) {
        d._graphDiv = this;
        this.style.display = 'none';
      });

    row.append('td')
      .append('div')
      .classed('carrot', true)
      .each(function(d) {
        d._carrotDiv = this;
      });

    var td = row.selectAll('.data-column-entry')
      .data(function(entry) {
        return app.TopicsTable.TABLE_COLUMNS.map(function(col) {

          return entry[col.prop];
        });
      }).enter()
      .append('td')
      .classed('data-column-entry', true);


    td.html(function(d, i) {
      var content = d;
      if (i === indexOfSentiment) {
        var cssClass = d < 0 ? 'sentiment-column-negative' : 'sentiment-column-positive';
        content = '<span class=' + cssClass + '></span>';
      } else {
        content = d;
      }
      return content;
    });
  };
})(window.app || (window.app = {}));
