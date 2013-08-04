/*global describe,beforeEach,sinon,it,expect,window,define */
/* jshint -W024 */
/* jshint expr:true */

var specs = function(PubSub) {

    'use strict';


    beforeEach(function() {
        PubSub.unsubscribe('all'); // reset global event provider
    });

    describe('global context', function() {

        var publish = PubSub.publish, // easy access aliases for Global pub/sub
        subscribe = PubSub.subscribe;


        it('can unsubscribe all listeners', function() { // tested first as used for test cleanup
            var fired = false;

            subscribe('testUnsubscribeAll', function() {
                fired = true;
            });

            PubSub.unsubscribe('all');

            publish('testUnsubscribeAll');

            expect(fired).to.equal(false);
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

                // expect(returned).to.equal(true, 'unexpected return type');
                expect(fired).to.equal(true, 'Event listener never fired');

            });

            it('can publish an event (async)', function(done) {

                var eventName = 'testEvent',
                returned = -1; // set to something unexpected

                this.timeout(100);

                subscribe(eventName, function() {

                    done();
                });

                window.setTimeout(function() {
                    returned = publish(eventName);
                    // expect(returned).to.equal(true, 'unexpected return type');
                }, 50);

            });


            it('can publish an event with listener object context', function() {

                var eventName = 'testEvent', context = {};

                subscribe(eventName, function() {
                    this.eventFired = true;
                }, context);

                publish(eventName);

                expect(context.eventFired).to.equal(true);

            });


            it('can publish with no subscribers', function() {

                var eventName = 'root.testEvent',

                returns = publish(eventName);

                expect(returns).to.equal(undefined);

            });

            it('can publish an event with multiple subscribers', function() {
                var topic = 'testEvent',
                value = 1;

                subscribe(topic, function() { value += 2; });
                subscribe(topic, function() { value += 3; });
                subscribe(topic, function() { value = value / 2; });

                publish(topic);

                expect(value).to.equal(3);

                publish(topic);

                expect(value).to.equal(4);
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

                expect(param1).to.equal(4);
                expect(param2).to.equal(2);
                expect(param3).to.equal(topic);
                expect(paramLength).to.equal(3);
                expect(value).to.equal(3);

            });

            it('can stop event propagation', function() {
                var topic = 'testStopPropagation',
                value = 1;

                subscribe(topic, function() { value += 2; return -1; }); // shouldn't stop as not === false
                subscribe(topic, function() { value += 3; return false; }); // expect stop
                subscribe(topic, function() { value /= 2; });

                publish(topic);

                expect(value).to.equal(6);

                publish(topic);

                expect(value).to.equal(11);
            });

        });

        it('can subscribe to map of listeners', function() {
            var listeners = {
                'listener1': sinon.spy(),
                'listener2': sinon.spy()
            };

            subscribe(listeners);

            publish('listener1');

            expect(listeners.listener1.calledOnce).to.be.true;
            expect(listeners.listener2.called).to.be.false;

            publish('listener2');

            expect(listeners.listener1.calledOnce).to.be.true;
            expect(listeners.listener2.calledOnce).to.be.true;
        });

        describe('unsubscribe', function() {
            it('can unsubscribe from a topic', function() {
                var topic = 'testUnsubscribeTopic',

                listener = sinon.spy();

                PubSub.subscribe(topic, listener);

                PubSub.publish(topic);

                expect(listener.callCount).to.equal(1);

                expect(PubSub.unsubscribe(topic, listener)).to.equal(true);

                PubSub.publish(topic);

                expect(listener.callCount).to.equal(1);
            });

            it('can unsubscribe one listener from a topic (multiple)', function() {
                var topic = 'testUnsubscribeTopic2',

                listener1 = sinon.spy(),
                listener2 = sinon.spy();

                PubSub.subscribe(topic, listener1);
                PubSub.subscribe(topic, listener2);

                PubSub.publish(topic);

                expect(listener1.callCount).to.equal(1);
                expect(listener2.callCount).to.equal(1);

                expect(PubSub.unsubscribe(topic, listener1)).to.equal(true);

                PubSub.publish(topic);

                expect(listener1.callCount).to.equal(1);
                expect(listener2.callCount).to.equal(2);

            });

            it('can not unsubscribe', function() {
                var topic = 'testUnsubscribeError',
                listener = sinon.spy(),
                listener2 = sinon.spy();

                PubSub.subscribe('somethingElse', listener);

                expect(PubSub.unsubscribe(topic, listener)).to.equal(false);

                PubSub.publish(topic);

                expect(listener.called).to.equal(false);

                PubSub.subscribe(topic, listener2);

                expect(PubSub.unsubscribe(topic, listener)).to.equal(false);

            });

        });

        describe('subscribeOnce', function() {
            it('can subscribe once to an event', function() {
                var topic = 'testTopic',

                listener1 = sinon.spy(),
                listener2 = sinon.spy();

                PubSub.subscribe(topic, listener1);
                PubSub.subscribeOnce(topic, listener2);

                PubSub.publish(topic);

                expect(listener1.callCount).to.equal(1);
                expect(listener2.callCount).to.equal(1);

                PubSub.publish(topic);

                expect(listener1.callCount).to.equal(2);
                expect(listener2.callCount).to.equal(1);

            });

            it('can unsubscribe a subscribeOnce listener', function() {
                var topic = 'testUnsubscribeOnce',
                listener = sinon.spy();

                PubSub.subscribeOnce(topic, listener);

                PubSub.unsubscribe(topic, listener);

                PubSub.publish(topic);

                expect(listener.callCount).to.equal(0);
            });
        });





    });

    describe('category contexts', function() {

        it('can publish a context event', function() {
            var category = 'testCategory',
            context = PubSub.context(category),
            topic = 'testTopic',
            categoryDotTopic = category + '.' + topic,
            // this.totalFireCount = 0,

            listener1 = sinon.spy(),
            listener2 = sinon.spy(),
            listener3 = sinon.spy(),
            listener4 = sinon.spy();

            context.subscribe(topic, listener1);
            PubSub.subscribe(topic, listener2);
            PubSub.subscribe(category, listener3);
            PubSub.subscribe('all', listener4);

            context.publish(topic);

            expect(listener1.calledOnce).to.be.true;
            expect(listener2.calledOnce).to.be.true;
            expect(listener3.calledOnce).to.be.true;
            expect(listener4.calledOnce).to.be.true;

            expect(listener2.calledAfter(listener1)).to.be.true;
            expect(listener3.calledAfter(listener2)).to.be.true;
            expect(listener4.calledAfter(listener3)).to.be.true;

        });

        // xit('can subscribe to all event in context');

    });

    describe('object contexts', function() {

        it('can attach pubsub methods to object constructor', function() {
            var category = 'MyObject',
            topic = 'testTopic',
            categoryDotTopic = category + '.' + topic,

            listener1 = sinon.spy(),
            listener2 = sinon.spy(),
            listener3 = sinon.spy(),
            listener4 = sinon.spy(),


            MyObject = function() {}; // constructor
            MyObject.prototype.testFn = function() {};

            this.totalFireCount = 0;

            var ctx = PubSub.context(category, MyObject);

            expect(typeof(MyObject.publish)).to.equal('function');
            expect(typeof(MyObject.subscribe)).to.equal('function');

            MyObject.subscribe(topic, listener1);
            PubSub.subscribe(topic, listener2);
            PubSub.subscribe(category, listener3);
            PubSub.subscribe('all', listener4);

            MyObject.publish(topic);

            expect(listener1.calledOnce).to.be.true;
            expect(listener2.calledOnce).to.be.true;
            expect(listener3.calledOnce).to.be.true;
            expect(listener4.calledOnce).to.be.true;

            expect(listener2.calledAfter(listener1)).to.be.true;
            expect(listener3.calledAfter(listener2)).to.be.true;
            expect(listener4.calledAfter(listener3)).to.be.true;
        });

        it('can attach pubsub methods to object instances with "id"s', function() {
            var category = 'MyInstanceObjectTests',
            topic = 'testTopic',
            categoryDotTopic = category + '.' + topic,

            instanceId = 'testID',
            categoryDotInstanceDotTopic = category + '.' + instanceId + '.' + topic,

            // Class def
            MyObject = function(id) { this.id = id; this.testInst = 'test'; }; // constructor
            MyObject.prototype.testFn = function() {};

            // Create Context
            var ctx = PubSub.context(category, MyObject),

            instance1 = new MyObject(instanceId),

            listeners = [],
            i;

            for (i = 0; i < 7; i++) {
                listeners[i] = sinon.spy();
            }

            expect(typeof(instance1.publish)).to.equal('function');
            expect(typeof(instance1.subscribe)).to.equal('function');

            instance1.subscribe(topic, listeners[0]);
            PubSub.subscribe(categoryDotInstanceDotTopic, listeners[1]);
            PubSub.subscribe(categoryDotTopic, listeners[2]);
            MyObject.subscribe(topic,  listeners[3]);
            PubSub.subscribe(topic,    listeners[4]);
            PubSub.subscribe(category, listeners[5]);
            PubSub.subscribe('all', listeners[6]);

            instance1.publish(topic);

            for (i = 0; i < 7; i++) {
                expect(listeners[i].calledOnce, 'listeners[' + i +'].calledOnce').to.be.true;
                if (i > 0) {
                    expect(listeners[i].calledAfter(listeners[i - 1]), 'listeners[' + i +'].calledAfter').to.be.true;
                }
            }
        });

        it('can attach pubsub methods to object instances without "id"s', function() {
            var category = 'MyInstanceObjectTests',
            topic = 'testTopic',
            categoryDotTopic = category + '.' + topic,

            // Class def
            MyObject = function() { this.testInst = 'test'; }; // constructor
            MyObject.prototype.testFn = function() {};

            // Create Context
            var ctx = PubSub.context(category, MyObject),
            listeners = [],
            i,
            myInstance = new MyObject();

            for (i = 0; i < 6; i++) {
                listeners[i] = sinon.spy();
            }

            myInstance.subscribe(topic,        listeners[0]);
            MyObject.subscribe(topic,          listeners[1]);
            PubSub.subscribe(categoryDotTopic, listeners[2]);
            PubSub.subscribe(topic,            listeners[3]);
            PubSub.subscribe(category,         listeners[4]);
            PubSub.subscribe('all',            listeners[5]);


            myInstance.publish(topic);


            for (i = 0; i < 6; i++) {
                expect(listeners[i].calledOnce, 'listeners[' + i +'].calledOnce').to.be.true;
                if (i > 0) {
                    expect(listeners[i].calledAfter(listeners[i - 1]), 'listeners[' + i +'].calledAfter').to.be.true;
                }
            }
        });

        it('can use instance as "this" in subscribers', function() {
            // Class def
            var MyObject = function(id) { this.id = id; },

            myInstance = new MyObject('thisInstance'),

            ctx = PubSub.context('testCategory', MyObject),

            topic = 'testTopic',
            topicFired = false;

            myInstance.subscribe(topic, function() {
                expect(this).to.equal(myInstance, '"this" was not instance');
                topicFired = true;
            });

            myInstance.publish(topic);

            expect(topicFired).to.equal(true, 'topic did not publish');
        });

        it('can attach event namespace to objects', function() {
            var MyObject = function(id) { this.id = id; },

            namespace = 'events',

            ctx = PubSub.context('testCategory', MyObject, namespace),

            myInstance = new MyObject('tester');

            expect(typeof(MyObject[namespace])).to.equal('object');
            expect(typeof(myInstance[namespace])).to.equal('object');
            expect(typeof(MyObject[namespace].publish)).to.equal('function');
            expect(typeof(MyObject[namespace].subscribe)).to.equal('function');
            expect(typeof(myInstance[namespace].publish)).to.equal('function');
            expect(typeof(myInstance[namespace].subscribe)).to.equal('function');

            expect(MyObject.publish).to.equal(undefined);
            expect(MyObject.subscribe).to.equal(undefined);
            expect(myInstance.publish).to.equal(undefined);
            expect(myInstance.subscribe).to.equal(undefined);

            // note: "this" in listener will no longer be instance, bug?
        });


        it('can listen to "all" events within a category context', function() {
            var category = 'MyObject',
            topic = 'testTopic',
            categoryDotTopic = category + '.' + topic,

            listener1 = sinon.spy(),
            listener2 = sinon.spy(),

            ctx = PubSub.context(category);

            this.totalFireCount = 0;

            ctx.subscribe(topic, listener1);
            ctx.subscribe('all', listener2);

            ctx.publish(topic);

            expect(listener1.calledOnce).to.be.true;
            expect(listener2.calledOnce).to.be.true;
        });
    });

    describe('private contexts', function() {
        it('can create a private context', function() {
            expect(typeof(PubSub)).to.equal('function');

            var privateContext = new PubSub();

            expect(typeof(privateContext.publish)).to.equal('function');
            expect(typeof(privateContext.subscribe)).to.equal('function');
        });

        it('can not fire global events', function() {
            var privateContext = new PubSub(),

            topic = 'testPrivateTopic',

            topicFired = false;

            privateContext.subscribe(topic, function() { topicFired = true; });

            PubSub.subscribe(topic, function() { throw 'Global topic fired unexpectedly'; });

            privateContext.publish(topic);

            expect(topicFired).to.equal(true, 'topic did not fire in private context');

        });

        it('can not respond to global events', function() {
            var privateContext = new PubSub(),

            topic = 'testGlobalTopic',

            topicFired = false;

            privateContext.subscribe(topic, function() { throw 'Private topic fired unexpectedly'; });

            PubSub.subscribe(topic, function() { topicFired = true; });

            PubSub.publish(topic);

            expect(topicFired).to.equal(true, 'topic did not fire in global context');
        });

        it('can change category separator', function() {
            var eventContext = new PubSub('|');

            var topic = 'testTopic',
            category = 'testCategory',

            categoryFired = false;

            eventContext.subscribe(category, function() { categoryFired = true; });

            eventContext.publish(category + '.' + topic);

            expect(categoryFired).to.equal(false);

            eventContext.publish(category + '|' + topic);

            expect(categoryFired).to.equal(true);
        });
    });

},


runTests = function(PubSub) {
    describe('pubsub-categories', function() {
        specs(PubSub);
    });
};


// RequireJS spec wrapper
if (this.require && this.define && this.define.amd) {
    this.require(['../pubsub-categories'], runTests);

} else if (this.require) { // node.js
    var PubSub = this.require('../pubsub-categories');

    runTests(PubSub);

} else if (this && this.PubSub) { // global
    runTests(this.PubSub);

}
