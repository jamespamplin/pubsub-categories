/*global describe,beforeEach,sinon,it,expect,window,define */
/* jshint -W024 */
/* jshint expr:true */

var PubSub = this.PubSub;

describe('publish hierarchical categories in global context', function() {


    var categoryLevels = [
        // 0 categories
        [
            'one',
            'all'
        ],

        // Level 1
        [
            'one.two',
            'two'
            // include level 0
        ],

        // Level 2
        [
            'one.two.three',
            'two.three',
            'one.three',
            'three'
            // include level 1,0
        ],

        // Level 3
        [
            'one.two.three.four',
            'two.three.four',
            'one.three.four',
            'three.four',

            'one.two.four',
            'two.four',
            'one.four',
            'four'
            // include level 2,1,0
        ],

        // Level 4
        [
            'one.two.three.four.five',
            'two.three.four.five',
            'one.three.four.five',
            'three.four.five',

            'one.two.four.five',
            'two.four.five',
            'one.four.five',
            'four.five',

            'one.two.three.five',
            'two.three.five',
            'one.three.five',
            'three.five',

            'one.two.five',
            'two.five',
            'one.five',
            'five'
            // include level 3,2,1,0
        ],

        // Level 5
        [
            'one.two.three.four.five.six',
            'two.three.four.five.six',
            'one.three.four.five.six',
            'three.four.five.six',

            'one.two.four.five.six',
            'two.four.five.six',
            'one.four.five.six',
            'four.five.six',

            'one.two.three.five.six',
            'two.three.five.six',
            'one.three.five.six',
            'three.five.six',

            'one.two.five.six',
            'two.five.six',
            'one.five.six',
            'five.six',

            'one.two.three.four.six',
            'two.three.four.six',
            'one.three.four.six',
            'three.four.six',

            'one.two.four.six',
            'two.four.six',
            'one.four.six',
            'four.six',

            'one.two.three.six',
            'two.three.six',
            'one.three.six',
            'three.six',

            'one.two.six',
            'two.six',
            'one.six',
            'six'
            // include level 4,3,2,1,0
        ],

        // Level 6
        [
            'one.two.three.four.five.six.seven',
            'two.three.four.five.six.seven',
            'one.three.four.five.six.seven',
            'three.four.five.six.seven',
            'one.two.four.five.six.seven',
            'two.four.five.six.seven',
            'one.four.five.six.seven',
            'four.five.six.seven',
            'one.two.three.five.six.seven',
            'two.three.five.six.seven',
            'one.three.five.six.seven',
            'three.five.six.seven',
            'one.two.five.six.seven',
            'two.five.six.seven',
            'one.five.six.seven',
            'five.six.seven',
            'one.two.three.four.six.seven',
            'two.three.four.six.seven',
            'one.three.four.six.seven',
            'three.four.six.seven',
            'one.two.four.six.seven',
            'two.four.six.seven',
            'one.four.six.seven',
            'four.six.seven',
            'one.two.three.six.seven',
            'two.three.six.seven',
            'one.three.six.seven',
            'three.six.seven',
            'one.two.six.seven',
            'two.six.seven',
            'one.six.seven',
            'six.seven',
            'one.two.three.four.five.seven',
            'two.three.four.five.seven',
            'one.three.four.five.seven',
            'three.four.five.seven',
            'one.two.four.five.seven',
            'two.four.five.seven',
            'one.four.five.seven',
            'four.five.seven',
            'one.two.three.five.seven',
            'two.three.five.seven',
            'one.three.five.seven',
            'three.five.seven',
            'one.two.five.seven',
            'two.five.seven',
            'one.five.seven',
            'five.seven',
            'one.two.three.four.seven',
            'two.three.four.seven',
            'one.three.four.seven',
            'three.four.seven',
            'one.two.four.seven',
            'two.four.seven',
            'one.four.seven',
            'four.seven',
            'one.two.three.seven',
            'two.three.seven',
            'one.three.seven',
            'three.seven',
            'one.two.seven',
            'two.seven',
            'one.seven',
            'seven'

            // include level 5,4,3,2,1,0
        ]
    ];

    for (var i = 1; i < categoryLevels.length; i++) {
        categoryLevels[i] = categoryLevels[i].concat(categoryLevels[i - 1]);
    }

    beforeEach(function() {
        PubSub.unsubscribe('all'); // reset global event provider
    });


    // Test runner for category specs
    function testOrderedCategories(topicToPublish, orderedTopics, done) {

        var topics = {},
        publishedListeners = [],
        last = orderedTopics.length - 1,

        loop = function(i, topic, listener) {
            topic = orderedTopics[i];

            if (topic) {
                listener = sinon.spy(function() {
                    publishedListeners.push(listener);
                    if (i === last) {
                        for (var j = 0, topic; (topic = orderedTopics[j]); j++) {
                            expect(topics[topic].calledOnce, 'spy ' + topic + ' calledOnce').to.be.true;
                            expect(topics[topic].calledWith(undefined, topicToPublish), 'spy ' + topic + ' calledWith topicName').to.be.true;
                            // expect(topics[topic]).to.have.been.calledOnce;
                            // expect(topics[topic]).to.have.been.calledWith(topicToPublish);
                        }

                        expect(publishedListeners.length).to.equal(orderedTopics.length, 'incorrect total fire count');

                        done();
                    }
                });
                listener.displayName = 'spy ' + topic;
                topics[topic] = listener;
                loop(i + 1);
            }
        };

        loop(0);

        PubSub.subscribe(topics);

        PubSub.publish(topicToPublish);


    }


    it('can publish 1 category level', function(done) {

        testOrderedCategories('one.two', categoryLevels[1], done);

    });

    it('can publish 2 category levels', function(done) {

        testOrderedCategories('one.two.three', categoryLevels[2], done);

    });


    it('can publish 3 category levels', function(done) {

        testOrderedCategories('one.two.three.four', categoryLevels[3], done);

    });



    it('can publish 4 category levels', function(done) {

        testOrderedCategories('one.two.three.four.five', categoryLevels[4], done);

    });

    it('can publish 5 category levels', function(done) {

        testOrderedCategories('one.two.three.four.five.six', categoryLevels[5], done);

    });

    it('can publish 6 category levels', function(done) {

        testOrderedCategories('one.two.three.four.five.six.seven', categoryLevels[6], done);

    });

});
