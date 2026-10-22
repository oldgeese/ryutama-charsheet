import { Runtime } from 'foldkit'

import { FirebaseService } from './firebase/service'
import { init } from './main'
import { Message } from './message'
import { Model } from './model'
import { update } from './update'
import { view } from './view'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  resources: FirebaseService.Default,
  routing: {
    onUrlRequest: request => Message.ClickedLink({ request }),
    onUrlChange: url => Message.ChangedUrl({ url }),
  },
  devTools: {
    Message,
  },
})

Runtime.run(application)
