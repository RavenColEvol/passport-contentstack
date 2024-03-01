class NullStore {
  constructor() {}
  store(req, cb) { cb(); }
  verify(req, providedState, cb) { cb(null, true) }
}

export default NullStore;