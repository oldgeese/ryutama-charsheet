import { Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { Dialog } from '@foldkit/ui'

import { type ListedCharacter } from '../character'
import {
  Characters,
  DuplicateCharacter,
  FetchCharacters,
  Message,
  type Model,
  Submission,
  init,
  notLoaded,
  reload,
  update,
} from './top'

const lulu: ListedCharacter = {
  id: 'a',
  characterName: 'ルル',
  playerName: 'たろう',
  level: 1,
  classes: [],
  types: [],
}

const bob: ListedCharacter = { ...lulu, id: 'b', characterName: 'ボブ' }

const loaded: Model = {
  ...notLoaded,
  searchInput: 'ル',
  characters: Characters.Loaded({ characters: [lulu] }),
}

describe('top page', () => {
  test('init loads the characters', () => {
    const init_ = init()
    expect(init_.model.characters).toEqual(Characters.Loading())
    expect(init_.commands).toHaveLength(1)
  })

  test('SucceededFetchCharacters shows the list', () => {
    story(
      update,
      given(init().model),
      message(Message.SucceededFetchCharacters({ characters: [lulu] })),
      model(model => {
        expect(model.characters).toEqual(
          Characters.Loaded({ characters: [lulu] }),
        )
      }),
    )
  })

  test('FailedFetchCharacters keeps the error and ClickedRetry fetches again', () => {
    story(
      update,
      given(init().model),
      message(Message.FailedFetchCharacters({ message: 'offline' })),
      model(model => {
        expect(model.characters).toEqual(
          Characters.Failed({ message: 'offline' }),
        )
      }),
      message(Message.ClickedRetry()),
      Command.expectExact(FetchCharacters),
      model(model => {
        expect(model.characters).toEqual(Characters.Loading())
      }),
      Command.resolve(
        FetchCharacters,
        Message.SucceededFetchCharacters({ characters: [] }),
      ),
    )
  })

  test('UpdatedSearchInput keeps the loaded list', () => {
    story(
      update,
      given(loaded),
      message(Message.UpdatedSearchInput({ value: 'ボ' })),
      Command.expectNone(),
      model(model => {
        expect(model.searchInput).toBe('ボ')
        expect(model.characters).toEqual(loaded.characters)
      }),
    )
  })

  test('reload fetches again and keeps the search input', () => {
    const reload_ = reload(loaded)
    expect(reload_.model).toEqual({
      ...loaded,
      characters: Characters.Loading(),
    })
    expect(reload_.commands).toHaveLength(1)
  })
})

const showedDialog = Dialog.Message.SucceededShowDialog()
const closedDialog = Dialog.Message.CompletedCloseDialog()

describe('top page: duplicating', () => {
  test('opens the password dialog for the clicked character', () => {
    story(
      update,
      given(loaded),
      message(Message.ClickedDuplicate({ character: lulu })),
      model(model => {
        expect(model.duplication).toMatchObject({
          source: Option.some(lulu),
          password: '',
          submission: Submission.Idle(),
        })
        expect(model.duplication.dialog.isOpen).toBe(true)
      }),
      Command.resolve(Dialog.ShowDialog, showedDialog),
    )
  })

  test('requires a password', () => {
    story(
      update,
      given(loaded),
      message(Message.ClickedDuplicate({ character: lulu })),
      Command.resolve(Dialog.ShowDialog, showedDialog),
      message(Message.SubmittedDuplicate()),
      Command.expectNone(),
      model(model => {
        expect(model.duplication.submission).toEqual(
          Submission.Failed({ message: 'パスワードを入力してください' }),
        )
      }),
    )
  })

  test('keeps the dialog open when the password is wrong', () => {
    story(
      update,
      given(loaded),
      message(Message.ClickedDuplicate({ character: lulu })),
      Command.resolve(Dialog.ShowDialog, showedDialog),
      message(Message.UpdatedDuplicatePassword({ value: 'wrong' })),
      message(Message.SubmittedDuplicate()),
      model(model => {
        expect(model.duplication.submission).toEqual(Submission.Duplicating())
      }),
      Command.expectExact(DuplicateCharacter({ id: 'a', password: 'wrong' })),
      Command.resolve(
        DuplicateCharacter({ id: 'a', password: 'wrong' }),
        Message.FailedDuplicate({ message: 'パスワードが違います' }),
      ),
      model(model => {
        expect(model.duplication).toMatchObject({
          password: 'wrong',
          submission: Submission.Failed({ message: 'パスワードが違います' }),
        })
        expect(model.duplication.dialog.isOpen).toBe(true)
      }),
    )
  })

  test('closes the dialog and reloads the list when it succeeds', () => {
    story(
      update,
      given(loaded),
      message(Message.ClickedDuplicate({ character: lulu })),
      Command.resolve(Dialog.ShowDialog, showedDialog),
      message(Message.UpdatedDuplicatePassword({ value: 'secret' })),
      message(Message.SubmittedDuplicate()),
      Command.resolve(
        DuplicateCharacter({ id: 'a', password: 'secret' }),
        Message.SucceededDuplicate({ id: 'copy' }),
      ),
      model(model => {
        expect(model.characters).toEqual(Characters.Loading())
        expect(model.searchInput).toBe('ル')
        expect(model.duplication.submission).toEqual(Submission.Idle())
        expect(model.duplication.dialog.isOpen).toBe(false)
      }),
      Command.expectExact(Dialog.CloseDialog, FetchCharacters),
      Command.resolve(Dialog.CloseDialog, closedDialog),
      Command.resolve(
        FetchCharacters,
        Message.SucceededFetchCharacters({ characters: [lulu, lulu] }),
      ),
    )
  })

  test('does not send twice while duplicating', () => {
    const duplicating = [
      Message.ClickedDuplicate({ character: lulu }),
      Message.UpdatedDuplicatePassword({ value: 'secret' }),
      Message.SubmittedDuplicate(),
    ].reduce<Model>((model, message_) => update(model, message_).model, loaded)
    story(
      update,
      given(duplicating),
      message(Message.SubmittedDuplicate()),
      Command.expectNone(),
      model(model => {
        expect(model.duplication.submission).toEqual(Submission.Duplicating())
      }),
    )
  })

  test('ignores a result when not duplicating', () => {
    story(
      update,
      given(loaded),
      message(Message.SucceededDuplicate({ id: 'copy' })),
      message(Message.FailedDuplicate({ message: 'internal' })),
      Command.expectNone(),
      model(model => {
        expect(model).toEqual(loaded)
      }),
    )
  })

  test('opening it again clears the password and the error', () => {
    story(
      update,
      given(loaded),
      message(Message.ClickedDuplicate({ character: lulu })),
      Command.resolve(Dialog.ShowDialog, showedDialog),
      message(Message.UpdatedDuplicatePassword({ value: 'wrong' })),
      message(Message.SubmittedDuplicate()),
      Command.resolve(
        DuplicateCharacter({ id: 'a', password: 'wrong' }),
        Message.FailedDuplicate({ message: 'パスワードが違います' }),
      ),
      message(
        Message.GotDuplicateDialogMessage({
          message: Dialog.Message.RequestedClose(),
        }),
      ),
      Command.resolve(Dialog.CloseDialog, closedDialog),
      message(Message.ClickedDuplicate({ character: bob })),
      Command.resolve(Dialog.ShowDialog, showedDialog),
      model(model => {
        expect(model.duplication).toMatchObject({
          source: Option.some(bob),
          password: '',
          submission: Submission.Idle(),
        })
      }),
    )
  })
})
