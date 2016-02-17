(function(app) {
  'use strict';
  app.TopSourceBoxes = function(dom, args) {
    this.domNode = dom;

    this.topSources = args.topSources;

    this._setup();
  };

  app.TopSourceBoxes.prototype.remove = function() {
    this._svg.remove();
    this.domNode.remove();
  };

  app.TopSourceBoxes.prototype.onClickHandle = function() {

  };

  app.TopSourceBoxes.prototype._setup = function() {

    var margin = {
      top: 10,
      right: 10,
      bottom: 10,
      left: 10
    };

    var chartWidth = 520;
    var chartHeight = 100;

    var width = chartWidth - margin.left - margin.right;
    var height = chartHeight - margin.top - margin.bottom;

    this._svg =
      d3.select(this.domNode)
      .append('svg')
      .attr('preserveAspectRatio', 'xMinYMin meet')
      .attr('viewBox', '0 0 ' + chartWidth + ' ' + chartHeight)
      .classed('top-sources', true)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var topSourcesLength = 3;
    var topSources = this.topSources.slice(0, topSourcesLength);
    var xScale = d3.scale.linear()
      .range([0, width])
      .domain([0, topSourcesLength]);

    var rectWidth = (width / topSourcesLength) - 30;




    var onBoxClickFunc = function(data) {
      var isItemUnclicked = false;
      var getOnClickFunc = function(className) {

        return function(d) {
          var isClicked = d3.select(this).classed(className);
          var isSameData = (d === data);
          if (isClicked && isSameData) {
            isItemUnclicked = true;
          }
          return (!isClicked && isSameData) ? true : false;
        };
      };
      this._svg.selectAll('rect')
        .classed('clicked-rect', getOnClickFunc('clicked-rect'));
      this._svg.selectAll('text')
        .classed('clicked-text', getOnClickFunc('clicked-text'));
      this.onClickHandle(isItemUnclicked ? null : data);
    }.bind(this);


    var getBoxHoverFunc = function(isHovered) {
      return function() {
        d3.select(this).select('rect').classed('hover-rect', isHovered);
        d3.select(this).select('text').classed('hover-text', isHovered);
      };
    };

    var rectGroup = this._svg.selectAll('rect')
      .data(topSources)
      .enter().append('g')
      .attr('transform', function(d, i) {
        return 'translate(' + xScale(i) + ',' + 0 + ')';
      })
      .on('click', onBoxClickFunc)
      .on('mouseout', getBoxHoverFunc(false))
      .on('mouseover', getBoxHoverFunc(true));

    rectGroup.append('rect')
      .classed('source-rect', true)
      .attr('x', 0)
      .attr('y', 0)
      .attr('height', height)
      .attr('width', rectWidth);


    var sourceLimit = 15;

    rectGroup.append('text')
      .classed('source-count', true)
      .attr('x', 10)
      .attr('y', height / 3)
      .attr('dy', '.35em')
      .on('mouseout', getBoxHoverFunc(false))
      .on('mouseover', getBoxHoverFunc(true))
      .text(function(d) {
        return d.count;
      })
      .append('tspan')
      .text(function(d) {
        var sourceId = d.sourceId;
        var ellipse = '...';
        if (sourceId.length > sourceLimit) {
          sourceId = sourceId.substring(0, sourceLimit - ellipse.length) + ellipse;
        }
        return sourceId;
      })
      .classed('source-name', true)
      .attr('x', 10)
      .attr('dy', 20);

    var sentimentHeight = 15;
    var self = this;
    rectGroup.append('g')
      .attr('transform', 'translate(' + 5 + ',' + (height - sentimentHeight) + ')')
      .each(function(d) {
        self._createSentimentBar(d.sentiments,
          d3.select(this), rectWidth, sentimentHeight);
      });
  };

  app.TopSourceBoxes.prototype._createSentimentBar = function(sentiments, parent, width, height) {

    var noOfRectangles = 10;
    var data = app.widgetUtil.generateSectionedColorData(
      app.widgetUtil.createSentimentEntriesObj(sentiments),
      noOfRectangles, app.widgetUtil.SENTIMENT_COLOR_MAP);

    var spacePerItem = Math.floor(width / noOfRectangles),
      paddingPerCircle = 1,
      paddingFromBottom = 2,
      maxCalculatedRadius = Math.floor(spacePerItem / 2),
      maxConstrainedRadius = Math.floor((height - paddingFromBottom) / 2),
      maxCircleRadius = maxCalculatedRadius > maxConstrainedRadius ?
      maxConstrainedRadius : maxCalculatedRadius,
      radiusPerCircle = maxCircleRadius - paddingPerCircle;

    parent.selectAll('circle')
      .data(data.colors)
      .enter()
      .append('circle')
      .attr('cx', function(d, i) {
        return (spacePerItem * i) + maxCircleRadius;
      })
      .attr('cy', maxCircleRadius)
      .attr('r', radiusPerCircle)
      .attr('fill', app.widgetUtil.fillSection);

    app.widgetUtil.addGradients(parent, data.gradients);

  };

})(window.app || (window.app = {}));
