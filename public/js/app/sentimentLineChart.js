(function(app) {
  'use strict';
  app.SentimentLineChart = function(dom, args) {

    this.domNode = dom;

    this.sentiments = args.sentiments;
    this.model = args.model;

    this._setup();
  };

  app.SentimentLineChart.prototype._createValueObjects = function(slices) {
    var values = [];
    slices.forEach(function(slice) {
      values.push({
        value: slice
      });
    });
    return values;
  };

  app.SentimentLineChart.prototype._setup = function() {


    var margin = {
        top: 20,
        right: 50,
        bottom: 80,
        left: 70
      },
      chartWidth = 1300,
      chartHeight = 350,
      width = chartWidth - margin.left - margin.right,
      height = chartHeight - margin.top - margin.bottom;


    //format the data
    var results = [{
      name: 'Positive',
      className: 'positive',
      tooltipClassName: 'sentimentTimeLineChart-tooltip-positive',
      label: 'Positive Sentiment',
      values: this._createValueObjects(this.sentiments.positive.slices)
    }, {
      name: 'Negative',
      className: 'negative',
      tooltipClassName: 'sentimentTimeLineChart-tooltip-negative',
      label: 'Negative Sentiment',
      values: this._createValueObjects(this.sentiments.negative.slices)
    }];

    var minTime = this.model.start + 1,
      maxTime = this.model.end,
      updateDate = this.model.updateDate;
    //assign a date to each entry
    results.forEach(function(sentiment) {
      if (sentiment.values) {
        var time = minTime;
        sentiment.values.forEach(function(valueObj) {
          valueObj.time = time++;
        });
      } else {
        console.error('Multi-time series chart: No values were found in input');
      }
    });


    this._svg = d3.select(this.domNode).append('svg')
      .classed('sentimentTimeLineChart', true)
      .attr('preserveAspectRatio', 'xMinYMin meet')
      .attr('viewBox', '0 0 ' + chartWidth + ' ' + chartHeight)
      .attr('height', function() {
        if (browserInfo.search('ie') !== -1)
          return '300';
        else
          return '100%';
      })
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    //create the scales

    var x = d3.scale.linear()
      .range([0, width]);

    var y = d3.scale.linear()
      .range([height, 0]);

    x.domain([minTime, maxTime]);

    y.domain([
      d3.min(results, function(c) {
        return d3.min(c.values, function(v) {
          return v.value;
        });
      }),
      d3.max(results, function(c) {
        return d3.max(c.values, function(v) {
          return v.value;
        });
      })
    ]);

    //build the axes
    this._drawXAxis(x, updateDate, height);
    this._drawYAxis(y);

    var sentimentClassFunc = function(d) {
      d3.select(this).classed(d.className, true);
    };


    var sentiment = this._svg.selectAll('.sentiment')
      .data(results)
      .enter().append('g')
      .classed('sentiment', true);

    this._drawLines(sentiment, x, y, sentimentClassFunc);

    var circleRadius = 5;
    this._drawLinePoints(sentiment, x, y, circleRadius);
    this._drawLegends(results, chartHeight, circleRadius, sentimentClassFunc);


  };

  app.SentimentLineChart.prototype._drawXAxis = function(x, updateDate, height) {

    var domainArr = x.domain(),
      maxDays = -domainArr[0],
      noOfMajorXTicks = 5,
      noOfMinorTicks = maxDays,
      xAxisTickSize = 35;
    if (maxDays < noOfMajorXTicks) {
      noOfMajorXTicks = maxDays;
    }

    var xAxis = d3.svg.axis()
      .scale(x)
      .innerTickSize(xAxisTickSize)
      .ticks(noOfMajorXTicks)
      .tickFormat(app.widgetUtil.getTickFormatCallback(updateDate))
      .orient('bottom');

    var xAxisLine = this._svg.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + height + ')')
      .call(xAxis);

    xAxisLine.selectAll('text')
      .attr('x', 5)
      .attr('y', xAxisTickSize - 10)
      .style('text-anchor', 'start');

    xAxisLine.selectAll('line')
      .attr('y1', 10);

    //minor ticks
    xAxisLine.selectAll('line').data(x.ticks(noOfMinorTicks), function(d) {
        return d;
      })
      .enter()
      .append('line')
      .attr('y1', 10)
      .attr('y2', xAxisTickSize - 15)
      .attr('x1', x)
      .attr('x2', x);
  };

  app.SentimentLineChart.prototype._drawYAxis = function(y) {
    var yAxis = d3.svg.axis()
      .scale(y)
      .ticks(5)
      .innerTickSize(0)
      .tickPadding(15)
      .orient('left');


    this._svg.append('g')
      .attr('class', 'y axis')
      .call(yAxis)
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -60)
      .attr('dy', '.71em')
      .classed('y-axis-label', true)
      .style('text-anchor', 'end')
      .text('mentions');

  };

  app.SentimentLineChart.prototype._drawLinePoints = function(sentiment, x, y, circleRadius) {

    //create tooltip
    var tooltip = d3.select(this.domNode).append('div')
      .classed('sentimentTimeLineChart-tooltip', true)
      .style('display', 'none')
      .style('opacity', '0')
      .html('Hello world');


    var tooltipTransition = 500;

    sentiment.selectAll('.line-points')
      .data(function(result) {
        return result.values;
      })
      .enter().append('circle')
      .classed('line-points', true)
      .attr('r', circleRadius)
      .attr('cx', function(d) {
        return x(d.time);
      })
      .attr('cy', function(d) {
        return y(d.value);
      })
      .each(function() {
        var d = d3.select(this.parentNode).datum();
        d3.select(this).classed(d.className, true);
      })
      .on('mouseover', function(d) {

        tooltip.style('left', (d3.event.pageX - 20) + 'px')
          .style('top', (d3.event.pageY - 60) + 'px')
          .classed(d3.select(this.parentNode).datum().tooltipClassName, true)
          .html(d.value)
          .transition()
          .duration(tooltipTransition)
          .style('opacity', '1')
          .style('display', 'block');


      })
      .on('mouseout', function() {
        tooltip.transition()
          .duration(tooltipTransition)
          .style('opacity', '0')
          .style('display', 'none');
        tooltip.classed(d3.select(this.parentNode).datum().tooltipClassName, false);
      });



  };

  app.SentimentLineChart.prototype._drawLines = function(sentiment, x, y, sentimentClassFunc) {

    var line = d3.svg.line()
      .x(function(d) {
        return x(d.time);
      })
      .y(function(d) {
        return y(d.value);
      });

    sentiment.append('path')
      .classed('line', true)
      .attr('d', function(d) {
        return line(d.values);
      })
      .each(sentimentClassFunc);

  };

  app.SentimentLineChart.prototype._drawLegends =
    function(results, chartHeight, circleRadius, sentimentClassFunc) {
      //create the legends
      var legend = this._svg.selectAll('.legend')
        .data(results)
        .enter().append('g')
        .attr('class', 'legend')
        .attr('transform', 'translate(0,' + (chartHeight - 30) + ')');

      var circleLocationFunc = function(d, i) {
        //TODO: Calculate the width of the previous text and use it here
        return i * (circleRadius + 120);
      };

      var legendTextPadding = 5;

      legend.append('circle')
        .classed('line-points', true)
        .attr('r', circleRadius)
        .attr('cx', circleLocationFunc)
        .each(sentimentClassFunc);

      legend.append('text')
        .attr('x', function(d, i) {
          return circleLocationFunc(d, i) + circleRadius + legendTextPadding;
        })
        .attr('dy', '.35em')
        .style('text-anchor', 'start')
        .classed('legend-text', true)
        .text(function(d) {
          return d.label;
        });
    };

  app.SentimentLineChart.prototype.remove = function() {
    this._svg.remove();
    this.domNode.remove();
  };


})(window.app || (window.app = {}));
