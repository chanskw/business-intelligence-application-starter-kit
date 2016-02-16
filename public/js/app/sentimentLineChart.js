(function(app) {
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
      right: 80,
      bottom: 50,
      left: 70
    };


    var chartWidth = 1300,
      chartHeight = 300;

    this._width = chartWidth - margin.left - margin.right;
    this._height = chartHeight - margin.top - margin.bottom;

    this._svg = d3.select(this.domNode).append('svg')
      .classed('sentimentTimeLineChart', true)
      .attr('preserveAspectRatio', 'xMinYMin meet')
      .attr('viewBox', '0 0 ' + chartWidth + ' ' + chartHeight)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var x = d3.time.scale()
      .range([0, this._width]);

    var y = d3.scale.linear()
      .range([this._height, 0]);

    var color = d3.scale.ordinal()
      .range(['#41D6BD', '#FF7461']);


    var minTime = this.model.start + 1;
    var maxTime = this.model.end;
    var updateDate = this.model.updateDate;

    var xAxis = d3.svg.axis()
      .scale(x)
      .tickFormat(app.widgetUtil.getTickFormatCallback(updateDate))
      .orient('bottom');

    var timeScaleLimit = 7;
    if((maxTime - minTime) < timeScaleLimit){
      xAxis.ticks(d3.time.day, 1);
    }else{
      xAxis.ticks(timeScaleLimit);
    }

    var yAxis = d3.svg.axis()
      .scale(y)
      .orient('left');

    var line = d3.svg.line()
      .x(function(d) {
        return x(d.time);
      })
      .y(function(d) {
        return y(d.value);
      });



    var sentimentCategories = ['Positive', 'Negative'];
    color.domain(sentimentCategories);

    var results = [{
      name: 'Positive',
      values: this._createValueObjects(this.sentiments.positive.slices)
    }, {
      name: 'Negative',
      values: this._createValueObjects(this.sentiments.negative.slices)
    }];


    results.forEach(function(sentiment) {
      if (sentiment.values) {
        var noOfElements = sentiment.values.length;
        var time = minTime;
        sentiment.values.forEach(function(valueObj, index) {
          valueObj.time = app.widgetUtil.convertDayToDate(time++, updateDate);
        });
      } else {
        console.error('Multi-time series chart: No values were found in input');
      }
    });


    x.domain([app.widgetUtil.convertDayToDate(minTime, updateDate),
       app.widgetUtil.convertDayToDate(maxTime, updateDate)]);

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

    this._svg.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + this._height + ')')
      .call(xAxis)
      .append('text')
      .attr('x', this._width - 30)
      .attr('y', 30)
      .attr('dy', '.71em')
      .style('text-anchor', 'start')
      .text('Date');

    this._svg.append('g')
      .attr('class', 'y axis')
      .call(yAxis)
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -60)
      .attr('dy', '.71em')
      .style('text-anchor', 'end')
      .text('Mentions');

    var sentiment = this._svg.selectAll('.sentiment')
      .data(results)
      .enter().append('g')
      .attr('class', 'sentiment');

    sentiment.append('path')
      .attr('class', 'line')
      .attr('d', function(d) {
        return line(d.values);
      })
      .style('stroke', function(d) {
        return color(d.name);
      });

    var circleRadius = 2.0;

    sentiment.selectAll('dot')
      .data(function(result) {
        return result.values;
      })
      .enter().append('circle')
      .attr('r', circleRadius)
      .attr('cx', function(d) {
        return x(d.time);
      })
      .attr('cy', function(d) {
        return y(d.value);
      })
      .style('fill', 'white')
      .style('stroke', function(d) {
        return color(d3.select(this.parentNode).datum().name);
      });

    var legend = this._svg.selectAll('.legend')
      .data(results.map(function(sentiment) {
        return sentiment.name;
      }))
      .enter().append('g')
      .attr('class', 'legend')
      .attr('transform', function(d, i) {
        return 'translate(55,' + i * 20 + ')';
      });

    legend.append('circle')
      .attr('r', circleRadius)
      .attr('cx', this._width - 70)
      .attr('cy', 6)
      .style('stroke', color)
      .style('fill', 'white');

    legend.append('text')
      .attr('x', this._width - 60)
      .attr('y', 6)
      .attr('dy', '.35em')
      .style('text-anchor', 'start')
      .classed('legend-text', true)
      .text(function(d) {
        return d === 'Positive' ? 'Positive Sentiment' : 'Negative Sentiment';
      });


  };

  app.SentimentLineChart.prototype.remove = function() {
    this._svg.remove();
    this.domNode.remove();
  };


})(window.app || (window.app = {}));
