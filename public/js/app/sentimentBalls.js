(function(app) {
  'use strict';
  app.SentimentBalls = function(dom, args) {
    this.domNode = dom;

    this.sentiments = args.sentiments;

    this._setup();
  };

  app.SentimentBalls.prototype.remove = function() {
    this._svg.remove();
    this.domNode.remove();
  };


  app.SentimentBalls.prototype._setup = function() {

    //variables for chart geomtetry specifications
    var svgWidth = 500,
      svgHeight = 100,
      margin = {
        top: 20,
        right: 0,
        left: 0,
        bottom: 0
      },
      width = svgWidth - margin.right - margin.left,
      //height = svgHeight - margin.top - margin.bottom,
      noOfBalls = 10;


    //variables for data
    var positive = this.sentiments.positive.count,
      negative = this.sentiments.negative.count,
      neutral = this.sentiments.neutral.count,
      total = positive + negative + neutral;


    var colorData = app.widgetUtil.generateSectionedColorData(
      app.widgetUtil.createSentimentEntriesObj(this.sentiments),
      noOfBalls, app.widgetUtil.SENTIMENT_COLOR_MAP);
    var ballsArr = colorData.colors;



    this._svg =
      d3.select(this.domNode)
      .append('svg')
      .classed('sentiment-balls', true)
      .attr('preserveAspectRatio', 'xMinYMin meet')
      .attr('viewBox', '0 0 ' + svgWidth + ' ' + svgHeight)
      .classed('sentiment-balls', true)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


    app.widgetUtil.addGradients(this._svg, colorData.gradients);


    var spacePerCircleBox = Math.floor(width / noOfBalls);
    var spacePerCircle = Math.floor(spacePerCircleBox / 2);
    var circleRadius = Math.floor(spacePerCircle / 2);



    this._svg.selectAll('circle')
      .data(ballsArr)
      .enter().append('circle')
      .classed('sentiment-circle', true)
      .attr('cx', function(d, i) {
        return (i * spacePerCircleBox) + spacePerCircle;
      })
      .attr('fill', app.widgetUtil.fillSection)
      .attr('stroke', 'transparent')
      .attr('cy', circleRadius)
      .attr('r', circleRadius);

    //Plus and negative symbols
    var plusG = this._svg.append('g')
      .attr('transform', 'translate(' +
        (width - (circleRadius * 3)) + ',' + (spacePerCircleBox) + ')')
      .attr('fill', app.widgetUtil.SENTIMENT_COLOR_MAP.positive);

    var plusSize = spacePerCircle;
    var plusStroke = 5;
    var plusDifferential = plusStroke / 2;
    var drawPoints = Math.ceil(circleRadius - plusDifferential);
    plusG.append('rect')
      .attr('x', drawPoints)
      .attr('y', 0)
      .attr('width', plusStroke)
      .attr('height', plusSize);

    plusG.append('rect')
      .attr('x', 0)
      .attr('y', drawPoints)
      .attr('width', plusSize)
      .attr('height', plusStroke);

    var negG = this._svg.append('g')
      .attr('transform', 'translate(' + circleRadius + ',' + (spacePerCircleBox) + ')')
      .attr('fill', app.widgetUtil.SENTIMENT_COLOR_MAP.negative);

    negG.append('rect')
      .attr('x', 0)
      .attr('y', drawPoints)
      .attr('width', plusSize)
      .attr('height', plusStroke);

    var yText = drawPoints + spacePerCircleBox,
      symbolSpace = drawPoints + plusSize + 10;

    var negPercent = Math.round((negative / total) * 100),
      posPercent = Math.round((positive / total) * 100);


    this._svg.append('text')
      .classed('sentiment-percent', true)
      .attr('x', symbolSpace)
      .attr('y', yText)
      .attr('dy', '.50em')
      .text(function() {
        return negPercent + '%';
      });

    //plus and negative text


    var rightExtraSpace;
    if (posPercent === 100) {
      rightExtraSpace = 35;
    } else if (Math.floor(negPercent / 10)) {
      rightExtraSpace = 30;
    } else {
      rightExtraSpace = 25;
    }

    this._svg.append('text')
      .classed('sentiment-percent', true)
      .attr('x', width - (symbolSpace + rightExtraSpace))
      .attr('y', yText)
      .attr('dy', '.50em')
      .text(function() {
        return posPercent + '%';
      });


  };

})(window.app || (window.app = {}));
