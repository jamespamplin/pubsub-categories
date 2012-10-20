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
TODO
