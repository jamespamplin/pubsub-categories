pubsub-categories
================
[![Build Status](https://travis-ci.org/jamespamplin/pubsub-categories.png)](https://travis-ci.org/jamespamplin/pubsub-categories)
[![Coverage Status](https://coveralls.io/repos/jamespamplin/pubsub-categories/badge.png?branch=master)](https://coveralls.io/r/jamespamplin/pubsub-categories?branch=master)

A JavaScript Publish / Subscribe custom event model with hierarchical categories for event topics.

Loosely coupled event logic. Reduce code by listening to categories of event topics.

```javascript
PubSub.subscribe('myCategory', function() { console.log('myCategory'); });
PubSub.subscribe('myTopic', function() { console.log('myTopic'); });

PubSub.publish('myCategory.myTopic');

// console.log: "myTopic"
// console.log: "myCategory"
```

Features
--------
- Global access to events.
- Hierarchical categories for events.
- Catch "all" to listen to every published event.
- Specifiable Listener callback context for "this".
- Stop event propagation by returning false.
- Category event contexts.
- Category contexts for objects.
- Private event contexts.
- Unsubscribe single listeners.
- Subscribe once to an event.



Usage
-----
RequireJS:

```javascript
require(['pubsub-categories'], function(PubSub) {
	// PubSub.publish() ...
});
```

Script tag:
```html
<head>
	<script type="text/javascript" src="pubsub-categories.js"></script>
	<script type="text/javascript">
		// PubSub.publish()
	</script>
</head>
```



Examples
--------
Learn by example...

### Widget states
Use a single listener to handle data change states.

```javascript
PubSub.subscribe('changed'); // Persist data
PubSub.subscribe('button'); // Redraw
PubSub.subscribe('added'); // Update status info
PubSub.subscribe('checkbox.changed.unchecked'); // Specific

PubSub.publish('button.changed.added');
PubSub.publish('button.changed.removed');
PubSub.publish('radio.changed.selected');
PubSub.publish('checkbox.changed.unchecked');
```

### Error handling
Use a single listener to display errors.

```javascript
PubSub.subscribe('failed'); // catch all errors
PubSub.publish('button.add.failed'); // throw error
PubSub.publish('field.validate.failed');
```

### Debug events
Listening to the `"all"` event can be useful for debugging:
```javascript
PubSub.subscribe('all', function() { console.log(arguments); });
```

Category Contexts
-----------------

### Fruits category example
```javascript
var PubSub = require('pubsub-categories');

var fruityEvents = PubSub.context('fruits');

fruityEvents.subcribe('all', function(topic) { console.log(topic); });

fruityEvents.publish('apples');
// console.log: "fruits.apples"

fruityEvents.publish('pears');
// console.log: "fruits.pears"
```

### Widget example
Categories can be easily applied to Object instances too.
Lets consider a widget object:

```javascript
// MyWidget Constructor
var MyWidget = function(id) {
	this.id = id;
};

// MyWidget: Instance methods
MyWidget.prototype = {
	doSomething: function() {
		// ...
	},

	doSomethingElse: function() {
		// ...
	}
};
```

We can extend its function prototype with its own PubSub event context:

```javascript
var PubSub = require('pubsub-categories');

PubSub.context('MyWidgetEvents', MyWidget);
```

This provides access to `publish()`, `subscribe()` and all other PubSub functions to every MyWidget instance.

So, we can now extend the MyWidget prototype to publish events:

```javascript
MyWidget.prototype = {
	// Instance methods

	doSomething: function() {
		this.publish('didSomething');
	},

	doSomethingElse: function() {
		this.publish('didSomethingElse');
	}
};
```

Later, when we create one or more instances of the widget:

```javascript
var widgetOne = new MyWidget('firstWidget');
var widgetTwo = new MyWidget('widgetTwo');
````

Then we can subscribe to widget events using any of:

```javascript
// Instance subscribe:
widgetOne.subscribe('didSomething', function() {
	console.log('my widget did something!');
});

// Class subscribe (static):
MyWidget.subscribe('didSomething', function() {
	console.log('any instance of MyWidget "didSomething"');
});

MyWidget.subscribe('all', function(topic) {
	console.log('an instance of MyWidget fired: ' + topic);
});

// Global context subscribe:
PubSub.subscribe('MyWidgetEvents', function(topic) {
	console.log('a MyWidgetEvents topic fired: ' + topic);
});

PubSub.subscribe('didSomethingElse', function(topic) {
	console.log('an object didSomethingElse');
});
```

Finally when we do something:
```javascript
widgetOne.doSomething();
// console.log: "my widget did something!"
// console.log: "any instance of MyWidget "didSomething""
// console.log: "an instance of MyWidget fired: MyWidgetEvents.firstWidget.didSomething"
// console.log: "a MyWidgetEvents topic fired: MyWidgetEvents.firstWidget.didSomething"

widgetTwo.doSomething();
// console.log: "any instance of MyWidget "didSomething""
// console.log: "an instance of MyWidget fired: MyWidgetEvents.widgetTwo.didSomething"
// console.log: "a MyWidgetEvents topic fired: MyWidgetEvents.widgetTwo.didSomething"

widgetTwo.doSomethingElse();
// console.log: "an object didSomethingElse"
// console.log: "an instance of MyWidget fired: MyWidgetEvents.widgetTwo.didSomethingElse"
// console.log: "a MyWidgetEvents topic fired: MyWidgetEvents.widgetTwo.didSomethingElse"
```
All published topics are prefixed with the context name (category).
Instance `id`'s are appended to the topic name.

