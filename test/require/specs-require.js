describe('pubsub-categories loaded via RequireJS', function() {

    it('can load module', function() {
        var PubSub = false;

        runs(function() {
            require(['pubsub-categories'], function(module) {
                PubSub = module;
            });
        });

        waitsFor(function() {
            return PubSub !== false;
        }, 'Module did not load', 1000);

        runs(function() {
            expect(typeof(PubSub.publish)).toBe('function');
            expect(typeof(PubSub.subscribe)).toBe('function');
        });
    });

    it('can publish an event', function() {

        var eventName = 'testEvent',
        fired = false,

        PubSub = false;

        runs(function() {
            require(['pubsub-categories'], function(module) {
                PubSub = module;
            });
        });

        waitsFor(function() {
            return PubSub !== false;
        }, 'Module did not load', 1000);

        runs(function() {
            PubSub.subscribe(eventName, function() {
                fired = true;
            });
        });

        runs(function() {
            PubSub.publish(eventName);
        });

        waitsFor(function() {
            return fired === true;
        }, 'Listener did not fire', 1000);
    });

});
