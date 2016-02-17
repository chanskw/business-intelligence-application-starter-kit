(function(app) {
  'use strict';
  app.ArticleTable = function(dom, args) {
    this.domNode = dom;

    this.model = args.model;
    this.source = args.source;
    this.articleBoundary = args.articleBoundary;

    this._setup();
  };


  app.ArticleTable.TABLE_COLUMNS = [{
    label: 'Article',
    prop: 'title'
  }, {
    label: 'Date',
    prop: 'date'
  }, {
    label: 'Tone',
    prop: 'tone'
  }];

  app.ArticleTable.prototype.remove = function() {
    this.domNode.remove();
  };

  app.ArticleTable.prototype._setup = function() {

    this.createTable(this.source.articles, 'Articles sorted from positive to negative');
  };

  app.ArticleTable.prototype._addRows = function(table, articles) {
    var row = table.append('tbody').selectAll('tr')
      .data(function() {
        return articles;
      })
      .enter()
      .append('tr');

    row.each(function(rowData) {
      var specificRow = d3.select(this);
      app.ArticleTable.TABLE_COLUMNS.forEach(function(column) {
        var td = specificRow.append('td')
          .classed('article-cell', true);
        switch (column.prop) {
          case 'title':
            td.append('a')
              .attr('target', '_blank')
              .attr('href', rowData.url)
              .html(rowData.title);
            break;
          case 'date':
            try {
              var date = new Date(rowData.timestamp * 1000);
              td.html(date.toDateString());
            } catch (e) {
              console.error(e);
            }
            break;
          case 'tone':
            var tones = [];
            if(rowData.tone &&
              rowData.tone.document_tone &&
              rowData.tone.document_tone.tone_categories instanceof Array
              ){
              rowData.tone.document_tone.tone_categories.forEach(function(toneCategory) {
                if (toneCategory.category_id === 'emotion_tone') {
                  toneCategory.tones.forEach(function(tone) {
                    if (tone.score !== 0) {
                      tones.push(tone);
                    }
                  });
                }
              });
            }
            tones.sort(function(elem1, elem2) {
              return elem2.score - elem1.score;
            });
            var toneText = '';
            var sep = '';
            tones.forEach(function(tone) {
              toneText += sep;
              toneText += tone.tone_name + ' (' + (tone.score * 100).toFixed(2) + '%)';
              sep = ', ';
            });
            td.html(toneText);
            break;
          default:
        }
      });
    });
  };

  app.ArticleTable.prototype.createTable = function(articles, caption) {
    var table = d3.select(this.domNode)
      .append('table')
      .classed('article-table', true)
      .attr('width', '100%');

    table.append('caption', caption)
      .classed('article-caption', true)
      .html(caption);


    table.append('thead')
      .append('tr')
      .selectAll('th')
      .data(app.ArticleTable.TABLE_COLUMNS).enter()
      .append('th')
      .classed('article-cell', true)
      .text(function(d) {
        return d.label;
      });

    var articleBoundary = this.source._articleBoundary;
    var clonedArray = articles.slice(0);
    var postiveArticles = clonedArray.splice(0, articleBoundary);
    var negativeArticles = clonedArray;

    var totalNoOfArticles = this.source._totalArticles;

    this._addRows(table, postiveArticles);
    if (negativeArticles.length) {
      if (totalNoOfArticles > (articleBoundary * 2)) {
        table.append('tbody')
          .append('tr')
          .append('td')
          .attr('colspan', app.ArticleTable.TABLE_COLUMNS.length)
          .classed('article-cell', true)
          .html(function() {
            var min = articleBoundary + 1;
            var max = totalNoOfArticles - articleBoundary;
            return min + ' ... ' + max;
          });
      }
      this._addRows(table, negativeArticles);
    }

  };

})(window.app || (window.app = {}));
