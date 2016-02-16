(function(app) {
  app.DatePicker = function(dom) {
    this.domNode = dom;


    this._setup();
  };

  app.DatePicker.MIN_TIME = -60;
  app.DatePicker.MAX_TIME = 0;

  app.DatePicker.prototype.onDateChange = function(startDay, endDay) {

  };

  app.DatePicker.prototype.setDays = function(startDay, endDay) {
    this._brush.extent([startDay, endDay]);


    this._brush(d3.select('.date-picker .brush'));


    this._brush.event(d3.select('.date-picker .brush'));
  };

  app.DatePicker.prototype._setup = function() {

    var originalWidth = 960;
    var originalHeight = 80;

    var margin = {
      top: 10,
      right: 50,
      bottom: 30,
      left: 10
    };
    var width = originalWidth - margin.left - margin.right;
    var height = originalHeight - margin.top - margin.bottom;

    var topSpace = 10;
    var sliderHeight = 4;

    var axisPos = topSpace + sliderHeight + 25;

    var x = d3.scale.linear()
      .range([0, width])
      .domain([app.DatePicker.MIN_TIME, app.DatePicker.MAX_TIME]);


    var brush = this._brush = d3.svg.brush()
      .x(x)
      .on('brushend', brushended);


    var svg = d3.select(this.domNode).append('svg')
      .attr('class', 'date-picker')
      .attr('preserveAspectRatio', 'xMinYMin meet')
      .attr('viewBox', '0 0 ' + originalWidth + ' ' + originalHeight)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var tickLabelCallback = app.widgetUtil.getTickFormatCallback(Date.now());

    svg.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + axisPos + ')')
      .call(d3.svg.axis()
        .scale(x)
        .innerTickSize(20)
        .orient('bottom'))
      .selectAll('text')
      .attr('x', 5)
      .attr('y', 10)
      .style('text-anchor', 'start')
      .text(tickLabelCallback);



    var gBrush = svg.append('g')
      .attr('class', 'brush')
      .call(brush);


    gBrush.selectAll('rect').
    attr('y', topSpace)
      .attr('height', sliderHeight);

    var triangleDown = d3.svg.symbol().type('triangle-down');
    gBrush.select('.w').append('path')
      .attr('d', triangleDown).classed('arrow-handle', true);

    var triangleUp = d3.svg.symbol().type('triangle-up');

    var triangleUpY = topSpace + sliderHeight + 10;
    gBrush.select('.e').append('path')
      .attr('transform', 'translate(0,' + triangleUpY + ')')
      .attr('d', triangleUp).classed('arrow-handle', true);

    var datePicker = this;

    function brushended() {
      if (d3.event.sourceEvent) {
        var originalExtent = brush.extent();
        var newExtent = [];
        originalExtent.forEach(function(extent) {
          newExtent.push(Math.round(extent));
        });
        if(newExtent[0] === newExtent[1]){
          if(newExtent[0] === app.DatePicker.MIN_TIME){
            newExtent[1] += 1;
          }else{
            newExtent[0] -= 1;
          }
        }
        d3.select(this).transition()
          .call(brush.extent(newExtent))
          .call(brush.event);
        datePicker.onDateChange(newExtent[0], newExtent[1]);
      }
    }

  };

})(window.app || (window.app = {}));
