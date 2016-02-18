(function(app) {
  'use strict';
  app.widgetUtil = {
    MILLIS_IN_DAY: 24 * 3600 * 1000,
    TODAYS_DATE_LABEL: 'today'
  };

  app.widgetUtil.SENTIMENT_COLOR_MAP = {
    positive: '#41D6DB',
    negative: '#FF7461',
    neutral: '#E8E8E8'
  };

  app.widgetUtil.PERCENT_MULTIPLIER = 100;

  app.widgetUtil.GRADIENT_PREFIX = 'sentiment-gradient_';

  app.widgetUtil._gradientCount = 0;

  app.widgetUtil.convertDayToDate = function(day, updateDate) {
    return updateDate + (day * app.widgetUtil.MILLIS_IN_DAY);
  };

  app.widgetUtil.getTickFormatCallback = function(updateDate) {
    return function(date) {
      if (!(date instanceof Date)) {
        date = new Date(app.widgetUtil.convertDayToDate(date, updateDate));
      }
      var xAxisStr = app.widgetUtil.TODAYS_DATE_LABEL;
      if (date.getTime() !== updateDate) {
        xAxisStr = (date.getMonth() + 1) + '/' + date.getDate();
      }
      return xAxisStr;
    };
  };

  app.widgetUtil._processSectionSpace =
  function(normalizedData, currentDataArr, remainingSectionSpace) {
    var entrySpace = 0,
      entry = normalizedData[0];
    if (entry.value > remainingSectionSpace) {
      entry.value -= remainingSectionSpace;
      entrySpace = remainingSectionSpace;
      remainingSectionSpace = 0;
    } else {
      entrySpace = entry.value;
      normalizedData.shift();
    }
    remainingSectionSpace -= entrySpace;
    if (entrySpace) {
      currentDataArr.push({
        id: entry.id,
        value: entrySpace
      });
    }
    return remainingSectionSpace;
  };

  app.widgetUtil._processGradients = function(currentDataArr, colorData, gradientData, colorMap) {
    var start = 0;
    var gradients = [];
    currentDataArr.forEach(function(currDataEntry, index) {
      if (index) {
        gradients.push({
          color: colorMap[currDataEntry.id],
          value: gradients[gradients.length - 1].value
        });
      }
      start += currDataEntry.value;
      gradients.push({
        color: colorMap[currDataEntry.id],
        value: start
      });
    });
    var gradientIndex = app.widgetUtil.GRADIENT_PREFIX + '_' + app.widgetUtil._gradientCount++;
    gradientData.push({
      id: gradientIndex,
      gradients: gradients
    });
    colorData.push({
      gradientId: gradientIndex
    });
  };

  app.widgetUtil._fillupSectionedColorData =
  function(normalizedData, colorData, gradientData, colorMap) {
    var currentDataArr = [];

    var remainingSectionSpace = app.widgetUtil.PERCENT_MULTIPLIER;
    while (normalizedData.length &&
      remainingSectionSpace > 0) {
      remainingSectionSpace = this._processSectionSpace(
        normalizedData, currentDataArr, remainingSectionSpace);
    }
    if (currentDataArr.length === 1) {
      colorData.push({
        color: colorMap[currentDataArr[0].id]
      });
    } else if (currentDataArr.length) {
      this._processGradients(currentDataArr, colorData, gradientData, colorMap);
    }
  };

  app.widgetUtil.generateSectionedColorData =
  function(slices, noOfSections, colorMap, gradientPrefix) {
    //Normalize the data into sectioned parts of 100
    var total = slices.reduce(function(previousValue, slice) {
      return previousValue + slice.value;
    }, 0);
    var normalizedData = slices.map(function(slice) {
      return {
        id: slice.id,
        value: Math.ceil((slice.value / total) * app.widgetUtil.PERCENT_MULTIPLIER) *
        noOfSections
      };
    });
    var colorData = [], gradientData = [];
    for (var count = 0; count < noOfSections; count++) {
      this._fillupSectionedColorData(
        normalizedData, colorData, gradientData, colorMap, gradientPrefix);
    }

    return {colors: colorData, gradients: gradientData};

  };

  app.widgetUtil.addGradients = function(parent, gradients) {
    parent.selectAll('defs')
      .data(gradients)
      .enter()
      .append('defs')
      .append('linearGradient')
      .attr('id', function(d) {
        return d.id;
      })
      .attr('x1', '0%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '0%')
      .selectAll('stop')
      .data(function(d) {
        return d.gradients;
      }).enter()
      .append('stop').attr('offset', function(grad) {
        return grad.value + '%';
      }).attr('stop-color', function(grad) {
        return grad.color;
      });
  };

  app.widgetUtil.createSentimentEntriesObj = function(sentiments){
    //order in sentiment key array controls the order we show the sentiment
    var sentimentsKeys = ['negative', 'neutral', 'positive'];
    return sentimentsKeys.map(function(sentimentKey){
      return {
        id: sentimentKey,
        value: sentiments[sentimentKey].count
      };
    });

  };

  app.widgetUtil.fillSection = function(d) {
    return d.color ? d.color :
      'url(#' + d.gradientId + ')';

  };

})(window.app || (window.app = {}));
