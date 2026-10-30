// Scratch's motion_goto treats these names as destinations before sprite lookup.
// A slash is outside the stable project-ID syntax, so these private names cannot
// collide with another valid ID. Ordinary IDs and stored projects stay intact.
export const scratchSceneTargetName = id => ['_mouse_', '_random_'].includes(id) ? '/gg/' + id : id;
export const sceneIdFromScratchTargetName = name => ['/gg/_mouse_', '/gg/_random_'].includes(name) ? name.slice(4) : name;
