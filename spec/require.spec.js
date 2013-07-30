/*global describe,beforeEach,sinon,it,expect,window,define */

describe('pubsub-categories loaded via RequireJS', function() {

    'use strict';

    it('can load module', function(done) {
        var PubSub = false;

        require(['../pubsub-categories'], function(module) {
            PubSub = module;

            expect(PubSub.publish).to.be.a('function');
            expect(PubSub.subscribe).to.be.a('function');

            done();
        });

    });

    it('can publish an event', function(done) {

        var eventName = 'testEvent',
        fired = false,
        PubSub = false;

        require(['../pubsub-categories'], function(module) {
            PubSub = module;

            PubSub.subscribe(eventName, function() {
                done();
            });

            PubSub.publish(eventName);
        });

    });

});
