## ES6 Class example

Here's an example of how you could use an ES6 subclass of `MobStore` for a data store.

This also shows how you can add instance methods to the items that you inject into the store.


```javascript
import {computed} from 'mobx';
import {MobStore} from 'mobstore';

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
    })

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
      fetch('/items.json')
        .then(({data}) => {
          this.inject(data); // assuming data is an array of item objects, or a single object
        })
    }
  }

}

//...

const itemStore = new ItemStore();

//...

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
        {itemStore.newItems.map(this.renderItem)}
      </div>
    );
  }
}

```
