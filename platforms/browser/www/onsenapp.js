document.addEventListener('init', function (event) {
            var page = event.target;
            if (page.id === 'page1') {
                page.querySelector('#push-button').onclick = function () {
                    document.querySelector('#myNavigator').pushPage('page2.html', {
                        data: {
                            title: 'Page 2'
                        }
                    });
                };
            }
        });