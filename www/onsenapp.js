document.addEventListener('init', function (event) {
    var page = event.target;
    if (page.id === 'page1') {
        page.querySelector('#push-button').onclick = function () {

            var name = document.getElementById('name').value;

            if (name !== '') {

                var modal = document.querySelector('ons-modal');
                modal.show();
                setTimeout(function () {
                    modal.hide();
                    document.querySelector('#myNavigator').pushPage('page2.html', {
                        data: {
                            title: 'Page 2'
                        }
                    });
                }, 2000);


            } else {
                ons.notification.alert('Please enter your name.');
            }
        };
    }
});

//var login = function() {
//  var name = document.getElementById('name').value;
//    
//  if (name !== '') {
//    ons.notification.alert('Hello ' + name + '!');
//  } else {
//      ons.notification.alert('Please enter your name.');
//  }
//};
