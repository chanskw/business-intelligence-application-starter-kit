(function(app){

  document.addEventListener('DOMContentLoaded', function() {
    var model = new app.WatsonModel();
    var controller = new app.MainController(model);

    controller.handleHash();

  });

})(window.app || (window.app={}));
