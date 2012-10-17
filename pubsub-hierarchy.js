/**
 * @module pubsub-hierarchy
 * 
 * publish / subcribe event model with hierarchy
 */

(function(context) {
	
	'use strict'; // TODO performance check

	var DEFAULT_SEPARATOR = '.';
	
	var Provider = function() {
		 this._events = {};
	};
	
	Provider.prototype = {
		
		/**
		 * Publishes an event by key, or composite events in an array with given parameters
		 *
		 * @return true if an event listener was fired.
		 */
		publish: function(/* array | string */ eventName, /* mixed */ params, /* local */ returns, /* local */ splitEvent, /* local */ idx) {
			returns = false;
			
			if (eventName instanceof Array) { // Handle publishing of event aliases
				for (idx = 0; splitEvent = eventName[idx]; idx++) {
					splitEvent = splitEvent.split(SEPARATOR);

					returns = this._publishHierarchy(eventName, splitEvent.pop(), splitEvent, params) || returns;
				}

			} else {
			
				splitEvent = eventName.split(SEPARATOR);
			
				returns = this._publishHierarchy(eventName, splitEvent.pop(), splitEvent, params);

			}

			return this._publishActual(eventName, 'all', params) || returns;
		},
		
		
		
		
		_publishActual: function(fullName, shortName, params, parent, /* local */ listeners, /* local */ listener, /* local */ i, /* local */ context, /* local */ returns) {
			parent = parent || this._events;
			returns = false;

			if (parent[shortName]) {
				listeners = parent[shortName]._listeners;

				for (i = 0; listener = listeners[i]; i++) {
					context = listener.context || this;
					listener = listener.callback || listener;

					if (listener.call(context, params, fullName) === false) { // Stops event propagation
						return true;
					}
					returns = true;
				}
			}
			return returns;
		},



		_publishHierarchy: function(/* string */ fullName,
			                        /* string */ shortName,
			                        /* array */ hierarchy,
			                        /* mixed */ params,
			                        /* optional int */ index,
			                        /* optional object */ parent,
			                        /* local */ current,
			                        /* local */ nextParent,
			                        /* local */ returns) {
			index = index || 0;
			parent = parent || this._events;
			current = hierarchy[index];
			returns = false;

			if (current && parent[current]) {
				nextParent = parent[current];
				
				returns = this._publishHierarchy(fullName, shortName, hierarchy, params, index + 1, nextParent);
				returns = this._publishActual(fullName, hierarchy[index], params, parent) || returns;
			}

			return this._publishActual(fullName, shortName, params, parent) || returns;

		},



		subscribe: function(/* string */ eventName, /* function */ listener, /* object */ context, /* local */ parent, /* local */ splitEvent, /* local */ i) {

			if (typeof(eventName) == 'string' && typeof(listener) == 'function') {

				parent = this._events;

				splitEvent = eventName.split(SEPARATOR);

				for (i = 0; eventName = splitEvent[i]; i++) {
					parent[eventName] = parent[eventName] || { '_listeners': [] };
					parent = parent[eventName];
				}

				parent._listeners.push(
					(context === undefined) ? listener : { 'callback': listener, 'context': context }
				);

				return true;
			}

			return false;
		}
		
		
		
	};


	if(typeof define === 'function' && define.amd) {
        define(function() {
            return Provider;
        });
    }
    else {
        context.Provider = Provider;
    }
	

})(this);
