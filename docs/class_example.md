## ES6 Class example

Here's an example of how you could use an ES6 subclass of `MobStore` for a data store.

This also shows how you can add instance methods to the items that you inject into the store.


```javascript
import {computed} from 'mobx';
import {MobStore} from 'mobstore';
import api from 'fictional-api'; // MobStore does not do any network requests.

class ItemStore extends MobStore {

  constructor() {
    super({
      collectionName: 'items',
      type: 'item',
      instanceMethods: {
        // as part of `inject`ing the objects into the store, MobStore sets up a
        // prototype for each, using these methods.
        isNew() {
          return this.created_at > 10.days.ago // pseudo-code but you get the idea.
        }
      }
    });

    extendObservable(this, {
      progress: false,
      errorMessage: null
    });
  }

  // use itemStore.newItems in a view. Then, whenever any item's data is updated,
  // this will automatically recompute and re-render your view, if the result
  // of this filtered list changed.
  @computed get newItems() {
    return this.items.filter((item) => {
      return item.isNew();
    });
  }

  // call this whenever you want to get new items from the server, or update with
  // any changes since you last checked.
  fetchAllItems() {
    api.get('/items.json')
      .then(({data}) => {
        this.inject(data); // assuming data is an array of item objects, or a single object
      })
  }

  // here is your flux async action. it's much simpler now, with mobx and mobstore.
  // this method is the "action creator". to create the action, just call the method.
  // setting the data is your "reducer" -- it changes the data. The UI is updated automatically.
  createItem(some_form_data) {
    this.progress = true;
    api.post('/items', some_form_data)
      .then(({data}) => {
        this.inject(data);
        this.progress = false;
        this.errorMessage = null;
      })
      .catch(({errorMessage}) => {
        this.progress = false;
        this.errorMessage = errorMessage;
      });
  }

}

//...

const itemStore = new ItemStore();

//...
```

## React Component

Here's how you could use the reactive data from the store above in a React component. Notice how we just supply the `itemStore`'s computed/observable values directly. There is no other boilerplate needed. Hook up a form submission to the `createItem` method and watch your list view update automatically.

In real life you'd probably only want the parent "container component" to import and use the store directly. See [Container Components](https://medium.com/@learnreact/container-components-c0e67432e005#.nms4vveql).


```javascript

@observer
class NewItemList extends React.Component {
  renderItem(item) {
    return (
      <Item item={item} />
    );
  }

  render() {
    return (
      <div>
        <ProgressSpinner visible={itemStore.progress} />
        <ErrorMessage
          visible={itemStore.errorMessage && itemStore.errorMessage.length}
          message={itemStore.errorMessage} />
        {itemStore.newItems.map(this.renderItem)}
      </div>
    );
  }
}

```
