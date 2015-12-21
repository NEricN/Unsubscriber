(function() {
      "use strict";

      window.addEventListener('load', function() {
            var socket = io();
            var domainMapping = {};

            var createRowElement = function(name, domain, url) {
                var $row = $($.parseHTML('<div class="list-group-item row" data-url="' + url + 
                             '"> <div class="col-md-6"><b>' + name + ' (' + domain + 
                             ')</b></div><div class="col-md-6"><a href="#">Unsubscribe</a></div> </div>'));
                $row.find('a').click(removeFunction);
                return $row;
            }

            var removeFunction = function() {
                var $parpar = $(this).parent().parent();
                console.log($parpar.data('url'));
                $parpar.animate({'margin-left': '-100px', 'opacity': '0'}, 500, function() {  
                    $(this).slideUp(500, function() {
                        $(this).remove();
                    });
                });
            }

            var addFunction = function(name, domain, url) {
                // we go backwards in time, so first url is always latest unsubscribe
                if(domainMapping[domain]) {
                    return;
                }
                domainMapping[domain] = url;
                console.log(domainMapping);
                var $row = createRowElement(name, domain, url);
                $row.hide();
                $("#main-list").append($row);
                $row.fadeIn('slow');
            }

            var primeSocketListeners = function(key) {
                socket.on('email-found-' + key, function(data) {
                    addFunction(data.from, data.domain, data.unsubLink);
                });

                socket.on('email-done-' + key, function(data) {
                    toastr.success('Email scanning completed!')
                })
            }

            var removeKeyInput = function() {
                $('#keyinput').val("");
            }

            var bindListeners = function() {
                $('#keyinput').keyup(function(e){
                    if(e.keyCode == 13)
                    {
                        primeSocketListeners($(e.target).val());
                        socket.emit('new-email', $(e.target).val());
                        removeKeyInput();
                    }
                });
            }

            bindListeners();

      }, false);

})();