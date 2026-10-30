import {scene2DObjectsOf} from '../project-format.mjs';
import {scene2DTextOwner} from '../contracts/scene2d-identifiers.mjs';
import {scene2DStageName} from '../contracts/scene2d-objects.mjs';

// What the consultation surfaces read about the scene (scene2d-multi-sprite 3.2):
// the object on screen and its name. The surfaces are built before the authoring
// coordinator exists, so everything answers null until connect().
export function createSceneScope(editor) {
  let authoring = null;
  const config = () => authoring ? scene2DObjectsOf(authoring.captureCapabilities()) : null;
  const selected = () => authoring?.mountedObject() ?? null;
  const nameOf = id => id === 'stage' ? scene2DStageName : config()?.sprites.find(sprite => sprite.id === id)?.name ?? null;
  return Object.freeze({
    connect(value) { authoring = value; },
    config, selected, nameOf,
    // The object the Código listing shows, as the editor holds it: the listing
    // follows the editor, which changes before the coordinator publishes a project.
    // With hero alone there is nothing to tell apart.
    listingOwner() {
      const objects = scene2DObjectsOf(editor.captureCapabilities()), id = editor.resourceOwner();
      if (!objects || id === null) return null;
      const name = id === 'stage' ? scene2DStageName : objects.sprites.find(sprite => sprite.id === id)?.name;
      return {textOwner: scene2DTextOwner(objects, id), name: objects.sprites.length > 1 || id === 'stage' ? name : null};
    },
    // The object a new text document writes for: the selected sprite, or the first one.
    documentOwner() {
      const objects = config();
      if (!objects) return null;
      const id = selected(), sprite = objects.sprites.find(item => item.id === id) ?? objects.sprites[0];
      return scene2DTextOwner(objects, sprite.id);
    },
    // Identity of the program: the whole scene, so choosing an object changes nothing.
    blocksKey: () => authoring?.blocksKey() ?? JSON.stringify(editor.save())
  });
}
