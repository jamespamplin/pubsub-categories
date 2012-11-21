/*global describe */

describe('pubsub-hierarchy tests', function() {

    var PubSub = window.PubSub, // Local closure capture, incase of name change
    EventProvider = PubSub,

    TestListener = function(testRunner, order) {
        this.fireCount = 0;
        this.testRunner = testRunner;
        this.expectedOrder = order;
    };

    TestListener.prototype.fire = function(params, eventName) {
        this.fireCount++;
        this.testRunner.totalFireCount++;
        this.order = this.testRunner.totalFireCount;

        this.lastArgs = arguments;
        this.lastEvent = eventName;
        this.lastParams = params;
    };

    beforeEach(function() {
        EventProvider.unsubscribe('all'); // reset global event provider
    });

    describe('global context', function() {

        var publish = EventProvider.publish, // easy access aliases for Global pub/sub
        subscribe = EventProvider.subscribe;


        it('can unsubscribe all listeners', function() { // tested first as used for test cleanup
            var fired = false;

            subscribe('testUnsubscribeAll', function() {
                fired = true;
            });

            EventProvider.unsubscribe('all');

            publish('testUnsubscribeAll');

            expect(fired).toBe(false);
        });





        describe('publish single events', function() {

            it('can publish an event', function() {

                var eventName = 'testEvent',
                fired = false,
                returned = -1; // set to something unexpected

                subscribe(eventName, function() {
                    fired = true;
                });

                returned = publish(eventName);

                expect(returned).toBe(true, 'unexpected return type');
                expect(fired).toBe(true, 'Event listener never fired');

            });

            it('can publish an event (new thread)', function() {

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

                returns = publish(eventName);

                expect(returns).toBe(undefined);

            });

            it('can publish an event with multiple subscribers', function() {
                var topic = 'testEvent',
                value = 1;

                subscribe(topic, function() { value += 2; });
                subscribe(topic, function() { value += 3; });
                subscribe(topic, function() { value = value / 2; });

                publish(topic);

                expect(value).toBe(3);

                publish(topic);

                expect(value).toBe(4);
            });

            it('can publish an event with multiple parameters', function() {
                var topic = 'testMultiParam',
                value = 1,

                param1, param2, param3, paramLength;

                subscribe(topic, function(x, y, z) {
                    param1 = x;
                    param2 = y;
                    param3 = z;
                    paramLength = arguments.length;

                    value += x / y;
                });

                publish(topic, 4, 2);

                expect(param1).toBe(4);
                expect(param2).toBe(2);
                expect(param3).toBe(topic);
                expect(paramLength).toBe(3);
                expect(value).toBe(3);

            });

            it('can stop event propagation', function() {
                var topic = 'testStopPropagation',
                value = 1;

                subscribe(topic, function() { value += 2; return -1; }); // shouldn't stop as not === false
                subscribe(topic, function() { value += 3; return false; }); // expect stop
                subscribe(topic, function() { value /= 2; });

                publish(topic);

                expect(value).toBe(6);

                publish(topic);

                expect(value).toBe(11);
            });

            it('can subscribe once to an event', function() {
                // TODO 'not yet implemented';
            });

        });

        describe('unsubscribe', function() {
            // TODO 'not yet implemented'
        });



        describe('publish hierarchical events in global context', function() {

            it('can publish events in hierarchy: 1 category level', function() {

                this.totalFireCount = 0;

                listeners = {
                    'root.testEvent':   new TestListener(this, 1),
                    'testEvent':        new TestListener(this, 2),
                    'root':             new TestListener(this, 3),
                    'all':              new TestListener(this, 4)
                };

                for(var key in listeners) {
                    var listener = listeners[key];
                    subscribe(key, listener.fire, listener);
                }

                param = 'testParam1';
                eventName = 'root.testEvent';

                runs(function() {
                    publish(eventName, param);
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

            it('can publish events in hierarchy: 2 category levels', function() {

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
                    subscribe(key, listener.fire, listener);
                }

                params = ['testParam1'];
                eventName = 'trunk.branch.leaf';

                runs(function() {
                    publish(eventName, 'testParam1');
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


            it('can publish events in hierarchy: 3 category levels', function() {

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
                    subscribe(topic, listener.fire, listener);
                    listeners[topic] = listener;
                }


                param = 'testParam1';
                eventName = 'one.two.three.four';

                runs(function() {
                    publish(eventName, param);
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

                    expect(this.totalFireCount).toEqual(orderedListenerTopics.length, 'unexpected total fire count');

                });
            });

            it('can stop propagation when in hierarchy', function() {
                var totalFireCount = 0,
                topic = 'one.two.three.four',
                value = 1,

                listeners = { // to listen for in expected order
                    'one.two.three.four': function() { value += 2; },
                    'four': function() { value += 3; },
                    'one.two.three': function() { value += 4; return false; }, // should stop here
                    'one': function() { value += 5; }
                };


                for(var key in listeners) {
                    var listener = listeners[key];
                    subscribe(key, listener);
                }


                runs(function() {
                    publish(topic);
                });

                runs(function() {
                    expect(value).toBe(10);
                });
            });

        });

    });

    describe('category contexts', function() {

        it('can publish a context event', function() {
            var category = 'testCategory',
            context = PubSub.context(category);
            topic = 'testTopic',

            topicInCategoryFired = false,
            categoryFired = false,
            topicFired = false,
            allFired = false;

            context.subscribe(topic, function() { topicInCategoryFired = true; });
            PubSub.subscribe(topic, function() { topicFired = true; });
            PubSub.subscribe(category, function() { categoryFired = true; });
            PubSub.subscribe('all', function() { allFired = true; });

            context.publish(topic);

            expect(topicInCategoryFired).toBe(true, 'topicInCategoryFired incorrect');
            expect(topicFired).toBe(true, 'topicFired incorrect');
            expect(categoryFired).toBe(true, 'categoryFired incorrect');
            expect(allFired).toBe(true, 'allFired incorrect');
        });

        xit('can subscribe to all event in context');

    });

    describe('object contexts', function() {

        it('can attach pubsub methods to object constructor', function() {
            var category = 'MyObject',
            topic = 'testTopic',

            topicInContextFired = false,
            categoryFired = false,
            topicFired = false,
            allFired = false;

            MyObject = function() {}; // constructor
            MyObject.prototype.testFn = function() {};

            var ctx = PubSub.context(category, MyObject);

            expect(typeof(MyObject.publish)).toBe('function');
            expect(typeof(MyObject.subscribe)).toBe('function');

            MyObject.subscribe(topic, function() { topicInContextFired = true; });
            PubSub.subscribe(topic, function() { topicFired = true; });
            PubSub.subscribe(category, function() { categoryFired = true; });
            PubSub.subscribe('all', function() { allFired = true; });

            MyObject.publish(topic);

            expect(topicInContextFired).toBe(true, 'topicInContextFired incorrect');
            expect(topicFired).toBe(true, 'topicFired incorrect');
            expect(categoryFired).toBe(true, 'categoryFired incorrect');
            expect(allFired).toBe(true, 'allFired incorrect');
        });

        it('can attach pubsub methods to object instances', function() {
            var category = 'MyInstanceObjectTests',
            topic = 'testTopic',

            topicInInstanceFired = false,
            topicInContextFired = false,
            categoryFired = false,
            topicFired = false,
            allFired = false;

            MyObject = function() { this.testInst = 'test'; }; // constructor
            MyObject.prototype.testFn = function() {};

            var ctx = PubSub.context(category, MyObject);

            var instance1 = new MyObject();

            instance1.subscribe(topic, function() { topicInInstanceFired = true; });
            MyObject.subscribe(topic, function() { topicInContextFired = true; });
            PubSub.subscribe(topic, function() { topicFired = true; });
            PubSub.subscribe(category, function() { categoryFired = true; });
            PubSub.subscribe('all', function() { allFired = true; });

            instance1.publish(topic);

            expect(topicInInstanceFired).toBe(true, 'topicInInstanceFired incorrect');
            expect(topicInContextFired).toBe(true, 'topicInContextFired incorrect');
            expect(topicFired).toBe(true, 'topicFired incorrect');
            expect(categoryFired).toBe(true, 'categoryFired incorrect');
            expect(allFired).toBe(true, 'allFired incorrect');
        });

        xit('can attach event namespace to objects');
    });

    xdescribe('private contexts', function() {
        it('can create a private context');

        it('can not fire global events');
    });

});
