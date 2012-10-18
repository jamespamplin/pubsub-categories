/*global describe */

describe('pubsub-hierarchy tests', function() {

    var Provider = window.Provider, // Local closure capture, incase of name change

    TestListener = function(testRunner, order) {
            this.fireCount = 0;
            this.testRunner = testRunner;
            this.expectedOrder = order;
    };

    TestListener.prototype.fire = function(params, eventName) {
        console.log('fired', arguments, this);
        this.fireCount++;
        this.testRunner.totalFireCount++;
        this.order = this.testRunner.totalFireCount;

        this.lastEvent = eventName;
        this.lastParams = params;
    };


    describe('subscribe in context', function() {



        it('can subscribe to a single event', function() {

            var events = new Provider(),
            eventName = 'testEvent',
            params = { 'testParam': 'testValue' };


            events.subscribe(eventName, function() {
                this.eventFired = true;
            }, this);

            runs(function() {
                this.returns = events.publish(eventName, params);
            });

            waitsFor(function() {
                return this.eventFired;
            }, 'Event listener never fired', 1000);

            runs(function() {
                expect(this.returns).toBe(true);
            });
        });


        it('can publish with no subscribers', function() {

            var events = new Provider(),
            eventName = 'root.testEvent',
            params = { 'testParam': 'testValue' },


            returns = events.publish(eventName, params);

            expect(returns).toBe(false);

        });

        it('can stop propagation', function() {
            expect(false).toBe(true, 'not yet implemented');
        });

        it('can subscribe once', function() {
            expect(false).toBe(true, 'not yet implemented');
        });

        it('can subscribe to multiple events', function() {
            expect(false).toBe(true, 'not yet implemented');
        });

        it('can publish multiple as alias', function() {
            expect(false).toBe(true, 'not yet implemented');
        });

    });

    describe('unsubscribe', function() {

    });

// implicit contexts
// named contexts

    describe('hierarchial events in context', function() {

        it('can fire events in hierarchy: 1 level', function() {

            var events = new Provider();

            this.totalFireCount = 0;



            listeners = {
                'all':              new TestListener(this, 4),
                'testEvent':        new TestListener(this, 3),
                'root':             new TestListener(this, 2),
                'root.testEvent':   new TestListener(this, 1)
            };

            for(var key in listeners) {
                var listener = listeners[key];
                events.subscribe(key, listener.fire, listener);
            }

            params = ['testParam'];
            eventName = 'root.testEvent';

            runs(function() {
                events.publish(eventName, params);
            });

            runs(function() {
                for(var key in listeners) {
                    var listener = listeners[key];

                    expect(listener.fireCount).toEqual(1);
                    expect(listener.order).toEqual(listener.expectedOrder);
                    expect(listener.lastEvent).toEqual(eventName);
                    expect(listener.lastParams).toEqual(params);
                }

                expect(this.totalFireCount).toEqual(4);
            });
        });

        it('can fire events in hierarchy: 3 levels', function() {

            var events = new Provider();

            this.totalFireCount = 0;


            listeners = {
                'all':                       new TestListener(this, 7),
                'trunk':                     new TestListener(this, 6),
                'branch':                    new TestListener(this, 5),
                'trunk.branch':              new TestListener(this, 4),
                'leaf':                      new TestListener(this, 3),
                'branch.leaf':               new TestListener(this, 2),
                'trunk.branch.leaf':         new TestListener(this, 1)
            };

            for(var key in listeners) {
                var listener = listeners[key];
                events.subscribe(key, listener.fire, listener);
            }

            params = ['testParam1'];
            eventName = 'trunk.branch.leaf';

            runs(function() {
                events.publish(eventName, 'testParam1');
            });

            runs(function() {
                for(var key in listeners) {
                    var listener = listeners[key];

                    expect(listener.fireCount).toEqual(1);
                    expect(listener.order).toEqual(listener.expectedOrder);
                    expect(listener.lastEvent).toEqual(eventName);
                    expect(listener.lastParams).toEqual(params[0]);
                }

                expect(this.totalFireCount).toEqual(6);
            });
        });

        it('can fire events in hierarchy: 4 levels', function() {

            var events = new Provider();

            this.totalFireCount = 0;


            listeners = {
                'one.two.three.four':  new TestListener(this, 1),
                'one.two.four':        new TestListener(this, 2),
                'one.four':            new TestListener(this, 3),
                'four':                new TestListener(this, 4),
                'one.two.three':       new TestListener(this, 5),
                'one.three':           new TestListener(this, 6),
                'three':               new TestListener(this, 7),
                'one.two':             new TestListener(this, 8),
                'two':                 new TestListener(this, 9),
                'one':                 new TestListener(this, 10),
                'all':                 new TestListener(this, 11)
            };

            for(var key in listeners) {
                var listener = listeners[key];
                events.subscribe(key, listener.fire, listener);
            }

            params = ['testParam1'];
            eventName = 'one.two.three.four';

            runs(function() {
                events.publish(eventName, 'testParam1');
            });

            runs(function() {
                for(var key in listeners) {
                    var listener = listeners[key];

                    expect(listener.fireCount).toNotEqual(0, 'fire count error - listener "' + key + '" never fired');
                    expect(listener.fireCount).toEqual(1, 'unexpected fire count for listener "' + key + '"');
                    expect(listener.order).toEqual(listener.expectedOrder, 'incorrect order for listener "' + key + '"');
                    expect(listener.lastEvent).toEqual(eventName, 'incorrect published topic for listener "' + key + '"');
                    expect(listener.lastParams).toEqual(params[0], 'incorrect event arguments for listener "' + key + '"');
                }

                expect(this.totalFireCount).toEqual(11, 'unexpected total fire count');

                console.log(events);
            });
        });

    });


    describe('global context', function() {
        // before(function() {
        //     Provider._reset();
        // });

        it('can subscribe to all event', function() {});

        it('can subscribe to a context event', function() {});

        it('can subscribe to any event', function() {});
    });

});
