// pxtsim registers a load callback which invokes Embed.start(). Prevent that
// legacy global message listener before load; our authenticated port owns input.
pxsim.Embed.start = () => {};
