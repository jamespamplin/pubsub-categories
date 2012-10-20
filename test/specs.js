/*global describe */

describe('pubsub-hierarchy tests', function() {

    var EventProvider = window.EventProvider, // Local closure capture, incase of name change

    TestListener = function(testRunner, order) {
        this.fireCount = 0;
        this.testRunner = testRunner;
        this.expectedOrder = order;
    };

    TestListener.prototype.fire = function(params, eventName) {
        this.fireCount++;
        this.testRunner.totalFireCount++;
        this.order = this.testRunner.totalFireCount;

        this.lastEvent = eventName;
        this.lastParams = params;
    };


    describe('global context', function() {

        var publish = EventProvider.publish,
        subscribe = EventProvider.subscribe;


        it('can remove all listeners', function() {
            var fired = false;

            subscribe('testRemoveAll', function() {
                fired = true;
            });

            EventProvider.removeAll();

            publish('testRemoveAll');

            expect(fired).toBe(false);
        });


        beforeEach(function() {
            EventProvider.removeAll(); // reset global event provider
        });


        describe('publish single events', function() {

            it('can publish an event', function() {

                var eventName = 'testEvent',
                fired = false,
                returned = -1; // set to something unexpected

                subscribe(eventName, function() {
                    fired = true;
                });

                runs(function() {
                    returned = publish(eventName);
                });

                waitsFor(function() {
                    return fired;
                }, 'Event listener never fired', 1000);

                runs(function() {
                    expect(returned).toBe(true, 'unexpected return type');
                    expect(fired).toBe(true, 'Event listener never fired');
                });
            });


            it('can publish an event with listener object context', function() {

                var eventName = 'testEvent';

                subscribe(eventName, function() {
                    this.eventFired = true;
                }, this);

                runs(function() {
                    this.returns = publish(eventName);
                });

                waitsFor(function() {
                    return this.eventFired;
                }, 'Event listener never fired', 1000);

                runs(function() {
                    expect(this.returns).toBe(true, 'unexpected return type');
                });
            });


            it('can publish with no subscribers', function() {

                var eventName = 'root.testEvent',

                returns = EventProvider.publish(eventName);

                expect(returns).toBe(undefined);

            });

            it('can publish an event with multiple subscribers', function() {

            });

            it('can publish an event with multiple parameters', function() {

            });

            it('can stop event propagation', function() {
                throw 'tests not yet implemented';
            });

            it('can subscribe once to an event', function() {
                throw 'not yet implemented';
            });

        });

        describe('unsubscribe', function() {
            // 'not yet implemented'
        });



        describe('publish hierarchial events in global context', function() {

            it('can publish events in hierarchy: 2 levels', function() {

                this.totalFireCount = 0;

                listeners = {
                    'root.testEvent':   new TestListener(this, 1),
                    'testEvent':        new TestListener(this, 2),
                    'root':             new TestListener(this, 3),
                    'all':              new TestListener(this, 4)
                };

                for(var key in listeners) {
                    var listener = listeners[key];
                    EventProvider.subscribe(key, listener.fire, listener);
                }

                param = 'testParam1';
                eventName = 'root.testEvent';

                runs(function() {
                    EventProvider.publish(eventName, param);
                });

                runs(function() {
                    for(var key in listeners) {
                        var listener = listeners[key];

                        expect(listener.fireCount).toNotEqual(0, 'fire count error - listener "' + key + '" never fired');
                        expect(listener.fireCount).toEqual(1, 'unexpected fire count for listener "' + key + '"');
                        expect(listener.order).toEqual(listener.expectedOrder, 'incorrect order for listener "' + key + '"');
                        expect(listener.lastEvent).toEqual(eventName, 'incorrect published topic for listener "' + key + '"');
                        expect(listener.lastParams).toEqual(param, 'incorrect event arguments for listener "' + key + '"');
                    }

                    expect(this.totalFireCount).toEqual(4, 'unexpected total fire count');
                });
            });

            it('can publish events in hierarchy: 3 levels', function() {

                this.totalFireCount = 0;

                listeners = {
                    'trunk.branch.leaf':         new TestListener(this, 1),
                    'trunk.leaf':                new TestListener(this, 2),
                    'leaf':                      new TestListener(this, 3),
                    'trunk.branch':              new TestListener(this, 4),
                    'branch':                    new TestListener(this, 5),
                    'trunk':                     new TestListener(this, 6),
                    'all':                       new TestListener(this, 7)
                };

                for(var key in listeners) {
                    var listener = listeners[key];
                    EventProvider.subscribe(key, listener.fire, listener);
                }

                params = ['testParam1'];
                eventName = 'trunk.branch.leaf';

                runs(function() {
                    EventProvider.publish(eventName, 'testParam1');
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

                    expect(this.totalFireCount).toEqual(7, 'unexpected total fire count');
                });
            });


            it('can publish events in hierarchy: 4 levels', function() {

                this.totalFireCount = 0;

                var orderedListenerTopics = [ // to listen for in expected order
                    'one.two.three.four',
                    'one.two.four',
                    'one.four',
                    'four',
                    'one.two.three',
                    'one.three',
                    'three',
                    'one.two',
                    'two',
                    'one',
                    'all'
                ],

                listeners = {};

                for (var i = 0, listener, topic; (topic = orderedListenerTopics[i]); i++) {
                    listener = new TestListener(this, i + 1);
                    EventProvider.subscribe(topic, listener.fire, listener);
                    listeners[topic] = listener;
                }


                params = ['testParam1'];
                eventName = 'one.two.three.four';

                runs(function() {
                    EventProvider.publish(eventName, 'testParam1');
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

                    expect(this.totalFireCount).toEqual(orderedListenerTopics.length, 'unexpected total fire count');

                });
            });

        });

    });

    describe('category contexts', function() {


        it('can subscribe to all event', function() {
            throw 'not yet implemented';
        });

        it('can subscribe to a context event', function() {
            throw 'not yet implemented';
        });

        it('can subscribe to any event', function() {
            throw 'not yet implemented';
        });
    });

    describe('object contexts', function() {

    });

});
