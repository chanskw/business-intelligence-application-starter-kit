(function(app) {
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
    };


    var chartWidth = 800,
      chartHeight = 300;

    var width = chartWidth - margin.left - margin.right;
    var height = chartHeight - margin.top - margin.bottom;


    var spacePerCircleBox = Math.floor(width / this.keywords.length);
    var spacePerCircle = Math.floor(spacePerCircleBox / 2);
    var circleRadius = Math.floor(spacePerCircle / 2);
    var circleMaxRadius = 25;
    if (circleRadius > circleMaxRadius) {
      circleRadius = circleMaxRadius;
    }

    var horizontalLineY = height - 40;
    var circleThreshold = horizontalLineY - (circleRadius * 2) - 10;

    this._svg = d3.select(this.domNode).append('svg')
      .classed('topic-chart', true)
      .attr('preserveAspectRatio', 'xMinYMin meet')
      .attr('viewBox', '0 0 ' + chartWidth + ' ' + chartHeight)
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

    var rectWidth = (width / 3) - 30;

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

    var rects = this._svg.selectAll('circle')
      .data(this.keywords)
      .enter().append('circle')
      //.classed('sentiment-circle', true)
      .attr('cx', circleXFunc)
      .attr('fill', '#FCEE6B')
      .attr('cy', horizontalLineY)
      .attr('r', circleRadius);

    var formatNumberFunc = function(num) {
      var million = 1000000;
      var billion = 1000000000;
      var thousand = 1000;
      var threeDigit = 100;
      var fixNum = 1;
      var numToShow;
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


    this._svg.selectAll('.ball-number')
      .data(this.keywords)
      .enter()
      .append('text')
      .classed('ball-number', true)
      .attr('x', function(d, i) {
        var value = d.count;
        var formattedNum = formatNumberFunc(d.count);
        var spacePerChar = 3;
        var totalSpace = spacePerChar * String(formattedNum).length;
        if (isNaN(formattedNum)) {
          totalSpace += -1;
        }
        var padding = 18 - totalSpace;
        return circleXFunc(d, i) - circleRadius + padding;
      })
      .attr('y', horizontalLineY + 3)
      .text(function(d, i) {
        return formatNumberFunc(d.count);
      });




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
      .text(function(d, i) {
        var objText = d.keyword;
        var textCutoffLen = 13;
        var ellipse = '...';
        if (objText.length > textCutoffLen) {
          objText = objText.substring(0, (textCutoffLen - ellipse.length)) + ellipse;
        }
        return objText;
      });


  };

  app.TopicsBallChart.prototype.remove = function() {
    this._svg.remove();
    this.domNode.remove();
  };


})(window.app || (window.app = {}));
