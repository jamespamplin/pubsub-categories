pubsub-hierarchy
================
A JavaScript Publish / Subscribe event model with hierarchical categories for event topics.

Loosely coupled event logic.
Reduce code by listening to event categories.

Features
--------
- Global access to events.
- Hierarchical categories for events.
- Catch "all" to listen to every published event.
- Specifiable Listener callback context for "this".
- Stop event propagation by returning false.

### Upcoming:
- Unsubscribe single listeners.
- Subscribe once to an event.
- Category event contexts - automatically specify category.
- Subscribe to DOM events on elements.
- Minified build

Use cases
---------
### Widget states
Use a single listener to handle data change states.

	subscribe('changed'); // Persist data
	subscribe('button'); // Redraw
	subscribe('added'); // Update status info
	subscribe('checkbox.changed.unchecked'); // Specific

	publish('button.changed.added');
	publish('button.changed.removed');
	publish('radio.changed.selected');
	publish('checkbox.changed.unchecked');


### Error handling
Use a single listener to display errors.

	subscribe('failed'); // catch all errors
	publish('button.add.failed'); // throw error
	publish('field.validate.failed');

### Debug events

	subscribe('all', function() { console.log(arguments); });

Usage
-----
TODO

Examples
--------

Category Contexts
-----------------
Learn by example:

### Fruits category example
TODO: make this better
```javascript
var PubSub = require('pubsub-hierarchy');

var context = PubSub.context('fruits');

context.publish('apples');
// console.log: "fruits.apples"

context.publish('pears');
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
var PubSub = require('pubsub-hierarchy');

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

```javascript
// Method signature planning:
PubSub.context = function(category, objectContext, namespace, idKey);
```
