(function(app){
  app.KeywordsTable = function(dom){
    this.domNode = dom;

    this._setup();
  };


  app.KeywordsTable.prototype._setup = function(){
    var table = this._table = d3.select(this.domNode)
      .append('table').attr('class', 'keywords-table-container');
    this.tableColumns = [
      {label: 'TOP KEYWORDS', prop: 'keyword'},
      {label: 'MENTIONS', prop:'mentions'},
      {label: 'SENTIMENT', prop: 'sentiment'}
    ];
    table.append('thead')
      .append('tr')
      .selectAll('th')
      .data(this.tableColumns).enter()
      .append('th')
      .text(function(d) { return d.label; });
  };

  app.KeywordsTable.prototype.loadData = function (data) {

    //TODO: temp data for prototype
    var thumbsUp = '&#128077;', thumbsDown = '&#128078;';
    data = [
      {keyword: 'APPLE WATCH', mentions: 202, sentiment: 1},
      {keyword: 'EL CAPTAIN', mentions: 158, sentiment: 1},
      {keyword: 'MACBOOK RETINA', mentions: 152, sentiment: -1},
      {keyword: 'IPHONE6', mentions: 159, sentiment: 1},
    ];

    var columns = this.tableColumns;
    var indexOfSentiment = 2;

    var rowGroupSelection = this._table.selectAll('tbody')
     .data(data).enter()
     .append('tbody');

     var row = rowGroupSelection.append('tr')
      .attr('class', 'keyword-row')
      .on('click', function(d, i){
         if(!this._sentimentLineChart){
           var dummyDiv = document.createElement('div');
           d._graphDiv.appendChild(dummyDiv);
           d._graphDiv.style.display = 'block';
           this._sentimentLineChart = new app.SentimentLineChart(dummyDiv, {w: 500, h: 200});
           this._sentimentLineChart.loadData();
         }else{
            d._graphDiv.style.display = 'none';
            this._sentimentLineChart.destroy();
            this._sentimentLineChart = null;
         }
     });

     rowGroupSelection.append('tr')
      .append('td')
      .attr('colspan', columns.length)
      .append('div')
      .each(function(d){
        d._graphDiv = this;
        this.style.display = 'none';
      });

     var td = row.selectAll('td')
     .data(function(entry, i) {
         return columns.map(function(col) {

             return entry[col.prop];
         });
     }).enter()
     .append('td');


     td.html(function(d, i){
        var content = d;
        if(i === indexOfSentiment){
          var cssClass = d == -1 ? 'sentiment-column-negative' : 'sentiment-column-positive';
          content = '<span class=' + cssClass + '></span>';
        }else{
          content = d;
        }
        return content;
      });
  };
})(window.app || (window.app={}));
