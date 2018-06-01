import {Decoration, DecorationSet} from "prosemirror-view"

import {
    key,
    selectedInsertionSpec,
    selectedDeletionSpec,
    selectedChangeFormatSpec
} from "./plugin"

export function getSelectedChanges(state) {
    let {decos} = key.getState(state)

    let insertion = decos.find(undefined, undefined, spec => spec === selectedInsertionSpec)[0],
        deletion = decos.find(undefined, undefined, spec => spec === selectedDeletionSpec)[0],
        format_change = decos.find(undefined, undefined, spec => spec === selectedChangeFormatSpec)[0]

    return {insertion, deletion, format_change}
}

export function setSelectedChanges(tr, type, pos) {
    let node = tr.doc.nodeAt(pos),
        mark = node.attrs.track ?
            node.attrs.track.find(trackAttr => trackAttr.type===type) :
            node.marks.find(mark => mark.type.name===type)
    if (!mark) {
        return
    }
    let selectedChange = node.isInline ? getFromToMark(tr.doc, pos, mark) : {from: pos, to: pos + node.nodeSize}
    let decos = DecorationSet.empty
    let spec
    if (type==='insertion') {
        spec = selectedInsertionSpec
    } else if (type==='deletion') {
        spec = selectedDeletionSpec
    } else if (type==='format_change') {
        spec = selectedChangeFormatSpec
    } else {
        console.warn('unknown track type')
    }
    let decoType = node.isInline ? Decoration.inline : Decoration.node
    decos = decos.add(tr.doc, [decoType(selectedChange.from, selectedChange.to, {
        class: `selected-${type}`
    }, spec)])
    return tr.setMeta(key, {decos})
}

export function deactivateAllSelectedChanges(tr) {
    let pluginState = {
        decos: DecorationSet.empty
    }
    return tr.setMeta(key, pluginState)
}

// From https://discuss.prosemirror.net/t/expanding-the-selection-to-the-active-mark/478/2 with some bugs fixed
export function getFromToMark(doc, pos, mark) {
    let $pos = doc.resolve(pos), parent = $pos.parent
    let start = parent.childAfter($pos.parentOffset)
    if (!start.node) {
        return null
    }
    let startIndex = $pos.index(), startPos = $pos.start() + start.offset
    while (startIndex > 0 && mark.isInSet(parent.child(startIndex - 1).marks)) {
        startPos -= parent.child(--startIndex).nodeSize
    }
    let endIndex = $pos.index() + 1, endPos = $pos.start() + start.offset + start.node.nodeSize
    while (endIndex < parent.childCount && mark.isInSet(parent.child(endIndex).marks)) {
        endPos += parent.child(endIndex++).nodeSize
    }
    return {from: startPos, to: endPos}
}
