(function(app) {
  'use strict';
  app.TopicsBallChart = function(dom, args) {

    this.domNode = dom;

    this.keywords = args.keywords;

    this._setup();
  };
  app.TopicsBallChart.prototype._setup = function() {
    var margin = {
        top: 10,
        right: 30,
        bottom: 10,
        left: 10
      },
      chartWidth = 800,
      chartHeight = 300,
      width = chartWidth - margin.left - margin.right,
      height = chartHeight - margin.top - margin.bottom,
      spacePerCircleBox = Math.floor(width / this.keywords.length),
      spacePerCircle = Math.floor(spacePerCircleBox / 2),
      circleRadius = Math.floor(spacePerCircle / 2),
      circleMaxRadius = 25;

    if (circleRadius > circleMaxRadius) {
      circleRadius = circleMaxRadius;
    }

    var horizontalLineY = height - 40;
    var circleThreshold = horizontalLineY - (circleRadius * 2) - 10;

    this._svg = d3.select(this.domNode).append('svg')
      .classed('topic-chart', true)
      .attr('preserveAspectRatio', 'xMinYMin meet')
      .attr('viewBox', '0 0 ' + chartWidth + ' ' + chartHeight)
      .attr('width', '100%')
      .attr('height', function() {
        if (browserInfo.search('ie') !== -1)
          return '300';
        else
          return '100%';
      })
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var yRanges = [];

    var values = this.keywords.map(function(data) {
      return data.count;
    });
    if (values.length) {
      var maxVal = values[0];
      yRanges.push(0);
      var lastVal = maxVal;
      var lastYVal = 0;
      var maxLineDiff = 50;
      values.forEach(function(val, i) {
        if ((i > 0) && (i < (values.length - 1))) {
          var percent = (val / lastVal);
          var threshold = circleThreshold - lastYVal;
          var yVal = circleThreshold - Math.round(threshold * percent);
          if ((yVal - lastYVal) > maxLineDiff) {
            yVal = lastYVal + maxLineDiff;
          }
          yRanges.push(yVal);
          lastVal = val;
          lastYVal = yVal;
        }
      });
      yRanges.push(circleThreshold);
    }

    var y = d3.scale.linear()
      .range(yRanges)
      .domain(values);


    this._svg.append('line')
      .style('stroke', 'black')
      .attr('x1', spacePerCircle)
      .attr('y1', horizontalLineY)
      .attr('x2', width - spacePerCircle)
      .attr('y2', horizontalLineY);


    var circleXFunc = function(d, i) {
      return (i * spacePerCircleBox) + spacePerCircle;
    };

    this._svg.selectAll('.vertical-line')
      .data(this.keywords)
      .enter().append('line')
      .classed('vertical-line', true)
      .style('stroke', 'black')
      .attr('x1', circleXFunc)
      .attr('y1', function(d) {
        return y(d.count);
      })
      .attr('x2', circleXFunc)
      .attr('y2', horizontalLineY);

    var nodeGroup = this._svg.selectAll('circle-node')
      .data(this.keywords)
      .enter().append('g')
      .classed('circle-node', true)
      .attr('transform', function(d, i){
        return 'translate(' + circleXFunc(d, i) + ',' + horizontalLineY + ')';
      })
      .on('click', function(d){
        this.onClickHandle(d);
      }.bind(this));

    nodeGroup.append('circle')
      .classed('circle-counter', true)
      .attr('r', circleRadius);


    nodeGroup.append('text')
      .classed('ball-number', true)
      .attr('x', function(d) {
        var formattedNum = this._formatNumber(d);
        var spacePerChar = 3;
        var totalSpace = spacePerChar * String(formattedNum).length;
        if (isNaN(formattedNum)) {
          totalSpace -= 1;
        }
        var padding = 18 - totalSpace;
        return padding - circleRadius;
      }.bind(this))
      .attr('y', 3)
      .text(this._formatNumber);




    this._svg.selectAll('.stick-text')
      .data(this.keywords)
      .enter()
      .append('text')
      .classed('stick-text', true)
      .attr('x', function(d, i) {
        return circleXFunc(d, i) + 6;
      })
      .attr('y', function(d) {
        var yPoint = y(d.count);
        if (yPoint > circleThreshold) {
          yPoint = circleThreshold;
        }
        return yPoint + 10;
      })
      .text(function(d) {
        var objText = d.keyword;
        var textCutoffLen = 13;
        var ellipse = '...';
        if (objText.length > textCutoffLen) {
          objText = objText.substring(0, (textCutoffLen - ellipse.length)) + ellipse;
        }
        return objText;
      });


  };

  app.TopicsBallChart.prototype.onClickHandle = function(/*data*/) {

  };


  app.TopicsBallChart.prototype._formatNumber = function(data) {
    var num = data.count,
      million = Math.pow(10, 6),
      billion = Math.pow(10, 9),
      thousand = Math.pow(10, 3),
      threeDigit = 100,
      fixNum = 1,
      numToShow;
    if (num >= (threeDigit * million)) {
      numToShow = parseFloat(num / billion).toFixed(fixNum) + 'B';
    } else if (num >= million) {
      numToShow = parseFloat(num / million).toFixed(fixNum) + 'M';
    } else if (num >= thousand) {
      numToShow = parseFloat(num / thousand).toFixed(fixNum) + 'K';
    } else {
      numToShow = num;
    }
    return numToShow;
  };

  app.TopicsBallChart.prototype.remove = function() {
    this._svg.remove();
    this.domNode.remove();
  };


})(window.app || (window.app = {}));
