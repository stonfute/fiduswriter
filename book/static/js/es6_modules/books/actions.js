let deleteBook = function (id) {
    let postData = {}
    postData['id'] = id
    $.ajax({
        url: '/book/delete/',
        data: postData,
        type: 'POST',
        dataType: 'json',
        success: function (data, textStatus, jqXHR) {
            stopBookTable()
            jQuery('#Book_' + id).detach()
            theBookList = _.reject(theBookList, function (book) {
                return book.id == id
            })
            startBookTable()
        },
    })
}
let stopBookTable = function () {
    jQuery('#book-table').dataTable().fnDestroy()
}

export let startBookTable = function () {
    // The sortable table seems not to have an option to accept new data added to the DOM. Instead we destroy and recreate it.
    jQuery('#book-table').dataTable({
        "bPaginate": false,
        "bLengthChange": false,
        "bFilter": true,
        "bInfo": false,
        "bAutoWidth": false,
        "oLanguage": {
            "sSearch": ''
        },
        "aoColumnDefs": [{
            "bSortable": false,
            "aTargets": [0, 5, 6]
        }],
    })

    jQuery('#book-table_filter input').attr('placeholder', gettext('Search for Book Title'))
    jQuery('#book-table_filter input').unbind('focus, blur')
    jQuery('#book-table_filter input').bind('focus', function() {
        jQuery(this).parent().addClass('focus')
    })
    jQuery('#book-table_filter input').bind('blur', function() {
        jQuery(this).parent().removeClass('focus')
    })

    let autocompleteTags = []
    jQuery('#book-table .fw-searchable').each(function() {
        autocompleteTags.push(this.textContent.replace(/^\s+/g, '').replace(/\s+$/g, ''))
    })
    autocompleteTags = _.uniq(autocompleteTags)
    jQuery("#book-table_filter input").autocomplete({
        source: autocompleteTags
    })
}

export let deleteBookDialog = function (ids) {
    jQuery('body').append('<div id="confirmdeletion" title="' + gettext(
            'Confirm deletion') +
        '"><p><span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 20px 0;"></span>' +
        gettext('Delete the book(s)?') + '</p></div>')
    diaButtons = {}
    diaButtons[gettext('Delete')] = function () {
        for (let i = 0; i < ids.length; i++) {
            deleteBook(ids[i])
        }
        jQuery(this).dialog("close")
        $.addAlert('success', gettext('The book(s) have been deleted'))
    }

    diaButtons[gettext('Cancel')] = function () {
        jQuery(this).dialog("close")
    }

    jQuery("#confirmdeletion").dialog({
        resizable: false,
        height: 180,
        modal: true,
        close: function () {
            jQuery("#confirmdeletion").detach()
        },
        buttons: diaButtons,
        create: function () {
            let theDialog = jQuery(this).closest(".ui-dialog")
            theDialog.find(".ui-button:first-child").addClass(
                "fw-button fw-dark")
            theDialog.find(".ui-button:last").addClass(
                "fw-button fw-orange")
        },
    })
}

let unpackBooks = function (booksFromServer) {
    // metadata and settings are stored as a json stirng in a text field on the server, so they need to be unpacked before being available.
    for (let i = 0; i < booksFromServer.length; i++) {
        booksFromServer[i].metadata = JSON.parse(booksFromServer[
            i].metadata)
        booksFromServer[i].settings = JSON.parse(booksFromServer[
            i].settings)
    }
    return booksFromServer
}


export let getBookListData = function (id) {
    $.ajax({
        url: '/book/booklist/',
        data: {},
        type: 'POST',
        dataType: 'json',
        success: function (response, textStatus, jqXHR) {
            theBookList = unpackBooks(response.books)
            theDocumentList = response.documents
            theTeamMembers = response.team_members
            theAccessRights = response.access_rights
            theUser = response.user
            jQuery.event.trigger({
                type: "bookDataLoaded",
            })
        },
        error: function (jqXHR, textStatus, errorThrown) {
            $.addAlert('error', jqXHR.responseText)
        },
        complete: function () {
            $.deactivateWait()
        }
    })
}


let selectCoverImageDialog = function (theBook,anImageDB) {
    let dialogHeader = gettext('Select cover image'),
        dialogBody = tmp_book_cover_image_selection({
            theBook: theBook,
            anImageDB: anImageDB
        })

    jQuery(document).on('click', '#imagelist tr', function () {
        if (jQuery(this).hasClass('checked')) {
            jQuery(this).removeClass('checked')
        } else {
            jQuery('#imagelist tr.checked').removeClass('checked')
            jQuery(this).addClass('checked')
        }
    })


    jQuery('body').append(dialogBody)

    if (theBook.cover_image) {
        jQuery('#Image_' + theBook.cover_image).addClass('checked')
    }

    jQuery('#cancelImageFigureButton').bind('click', function () {
        jQuery('#book-cover-image-selection').dialog('close')
    })

    jQuery('#selectImageFigureButton').bind('click', function () {
        if (jQuery('#imagelist tr.checked').length === 0) {
            delete theBook.cover_image
        } else {
            theBook.cover_image = parseInt(jQuery('#imagelist tr.checked')[0].id.substring(6))
        }
        jQuery('#figure-preview-row').html(tmp_book_epub_data_cover({
            'anImageDB': anImageDB,
            'theBook': theBook
        }))
        jQuery('#book-cover-image-selection').dialog('close')
    })


    jQuery('#book-cover-image-selection').dialog({
        draggable: false,
        resizable: false,
        top: 10,
        width: 'auto',
        height: 'auto',
        modal: true,
        buttons: {},
        create: function () {},
        close: function () {
            jQuery(document).off('click', '#imagelist tr')
            jQuery('#selectImageFigureButton').unbind('click')
            jQuery('#cancelImageFigureButton').unbind('click')
            jQuery('#book-cover-image-selection').dialog('destroy')
                .remove()
        }
    })
}

let editChapterDialog = function (aChapter, theBook) {
    let aDocument = _.findWhere(theDocumentList, {
        id: aChapter.text
    }),
        documentTitle = aDocument.title,
        dialogHeader, dialogBody
    if (documentTitle.length < 0) {
        documentTitle = gettext('Untitled')
    }
    dialogHeader = gettext('Edit Chapter') + ': ' + aChapter.number +
        '. ' + documentTitle
    dialogBody = tmp_book_chapter_dialog({
        'dialogHeader': dialogHeader,
        'aChapter': aChapter
    })

    jQuery('body').append(dialogBody)
    let diaButtons = {}
    diaButtons[gettext('Submit')] = function () {
        aChapter.part = jQuery('#book-chapter-part').val()
        jQuery('#book-chapter-list').html(tmp_book_chapter_list({
            theBook: theBook
        }))
        jQuery(this).dialog('close')
    }
    diaButtons[gettext('Cancel')] = function () {
        jQuery(this).dialog("close")
    }
    jQuery('#book-chapter-dialog').dialog({
        draggable: false,
        resizable: false,
        top: 10,
        width: 300,
        height: 200,
        modal: true,
        buttons: diaButtons,
        create: function () {
            let theDialog = jQuery(this).closest(".ui-dialog")
            theDialog.find(".ui-button:first-child").addClass(
                "fw-button fw-dark")
            theDialog.find(".ui-button:last").addClass(
                "fw-button fw-orange")
        },
        close: function () {
            jQuery('#book-chapter-dialog').dialog('destroy').remove()
        }
    })

}


let saveBook = function (theBook, theOldBook, currentDialog) {
    $.ajax({
        url: '/book/save/',
        data: {
            the_book: JSON.stringify(theBook)
        },
        type: 'POST',
        dataType: 'json',
        success: function (response, textStatus, jqXHR) {
            if (jqXHR.status == 201) {
                theBook.id = response.id
                theBook.added = response.added
            }
            theBook.updated = response.updated
            if (typeof (theOldBook) != 'undefined') {
                theBookList = _.reject(theBookList, function (book) {
                    return (book === theOldBook)
                })
            }
            theBookList.push(theBook)
            stopBookTable()
            jQuery('#book-table tbody').html(tmp_book_list())
            startBookTable()
            if ((typeof (currentDialog) != 'undefined')) {
                jQuery(currentDialog).dialog('close')
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            $.addAlert('error', jqXHR.responseText)
        },
        complete: function () {}
    })
}

export let copyBook = function (theOldBook) {
    let theBook = jQuery.extend(true, {}, theOldBook)
    theBook.id = 0
    theBook.is_owner = true
    theBook.owner_avatar = theUser.avatar
    theBook.owner_name = theUser.name
    theBook.owner = theUser.id
    theBook.rights = 'w'
    if (theOldBook.owner != theBook.owner) {
        function setCoverImage(id) {
            theBook.cover_image = id
            saveBook(theBook)
        }
        prepareCopyCoverImage(theBook.cover_image,
            theOldBook.owner, setCoverImage)
    } else {
        saveBook(theBook)
    }
}

let prepareCopyCoverImage = function (coverImage, userId,
    callback) {
    if ('undefined' === typeof (ImageDB)) {
        usermediaHelpers.getImageDB(function () {
            prepareCopyCoverImage(coverImage, userId,
                callback)
            return
        })
    } else {
        usermediaHelpers.getAnImageDB(userId, function (anImageDB) {
            copyCoverImage(anImageDB[coverImage],
                callback)
        })
    }
}

let copyCoverImage = function (oldImageObject, callback) {
    let newImageEntry = false,
        imageTranslation = false

    matchEntries = _.where(ImageDB, {
        checksum: oldImageObject.checksum
    })
    if (0 === matchEntries.length) {
        //create new
        newImageEntry = {
            oldUrl: oldImageObject.image,
            title: oldImageObject.title,
            file_type: oldImageObject.file_type,
            checksum: oldImageObject.checksum
        }
    } else if (1 === matchEntries.length && oldImageObject.pk !==
        matchEntries[0].pk) {
        imageTranslation = matchEntries[0].pk
    } else if (1 < matchEntries.length) {
        if (!(_.findWhere(matchEntries, {
            pk: oldImageObject.pk
        }))) {
            // There are several matches, and none of the matches have the same id as the key in shrunkImageDB.
            // We now pick the first match.
            // TODO: Figure out if this behavior is correct.
            imageTranslation = matchEntries[0].pk
        }
    }

    if (imageTranslation) {
        callback(imageTranslation)
    } else if (newImageEntry) {
        createNewImage(newImageEntry, callback)
    } else {
        callback(oldImageObject.pk)
    }

}

let createNewImage = function (imageEntry, callback) {
    let xhr = new XMLHttpRequest()
    xhr.open('GET', imageEntry.oldUrl, true)
    xhr.responseType = 'blob'

    xhr.onload = function (e) {
        if (this.status == 200) {
            // Note: .response instead of .responseText
            let imageFile = new Blob([this.response], {
                type: imageEntry.file_type
            })
            let formValues = new FormData()
            formValues.append('id', 0)
            formValues.append('title', imageEntry.title)
            formValues.append('imageCats', '')
            formValues.append('image', imageFile,
                imageEntry.oldUrl.split('/').pop())
            formValues.append('checksum', imageEntry.checksum),

            jQuery.ajax({
                url: '/usermedia/save/',
                data: formValues,
                type: 'POST',
                dataType: 'json',
                success: function (response, textStatus, jqXHR) {
                    ImageDB[response.values.pk] = response.values
                    callback(response.values.pk)
                },
                error: function () {
                    jQuery.addAlert('error', gettext(
                            'Could not save ') +
                        imageEntry.title)
                },
                complete: function () {},
                cache: false,
                contentType: false,
                processData: false
            })
            return
        }
    }

    xhr.send()
}


export let createBookDialog = function (bookId, anImageDB) {
    let dialogHeader, theBook, theOldBook

    if (bookId === 0) {
        dialogHeader = gettext('Create Book')
        theBook = {
            title: '',
            id: 0,
            chapters: [],
            is_owner: true,
            owner_avatar: theUser.avatar,
            owner_name: theUser.name,
            owner: theUser.id,
            rights: 'w',
            metadata: {},
            settings: {
                citationstyle: 'apa',
                documentstyle: defaultDocumentStyle,
                papersize: 'octavo'
            }
        }
    } else {
        theOldBook = _.findWhere(theBookList, {
            id: bookId
        })
        theBook = jQuery.extend(true, {}, theOldBook)
        dialogHeader = gettext('Edit Book')
    }


    if ('undefined' === typeof (anImageDB)) {
        if ('undefined' === typeof (ImageDB) && theBook.is_owner) {
            // load the ImageDB if it is not available yet. Once done, load this function.
            usermediaHelpers.init(function () {
                createBookDialog(bookId, ImageDB)
            })
            return
        } else if (!theBook.is_owner) {
            usermediaHelpers.getAnImageDB(theBook.owner, function (anImageDB) {
                createBookDialog(bookId, anImageDB)
            })
            return
        } else {
            createBookDialog(bookId, ImageDB)
            return
        }
    }

    let dialogBody = tmp_book_dialog({
        dialogHeader: dialogHeader,
        basicInfo: tmp_book_basic_info({
            theBook: theBook
        }),
        chapters: tmp_book_dialog_chapters({
            theBook: theBook,
            chapters: tmp_book_chapter_list({
                theBook: theBook,
            }),
            documents: tmp_book_document_list({
                theBook: theBook,
                theDocumentList: theDocumentList
            })
        }),
        bibliographyData: tmp_book_bibliography_data({
            theBook: theBook
        }),
        printData: tmp_book_print_data({
            theBook: theBook
        }),
        epubData: tmp_book_epub_data({
            theBook: theBook,

            coverImage: tmp_book_epub_data_cover({
                theBook: theBook,
                anImageDB: anImageDB
            })
        })

    })
    jQuery(document).on('click', '.book-sort-up', function () {
        let chapter = _.findWhere(theBook.chapters, {
            text: parseInt(jQuery(this).attr('data-id'))
        })
        let higherChapter = _.findWhere(theBook.chapters, {
            number: (chapter.number - 1)
        })
        chapter.number--
        higherChapter.number++
        jQuery('#book-chapter-list').html(tmp_book_chapter_list({
            theBook: theBook
        }))
    })
    jQuery(document).on('click', '.book-sort-down', function () {
        let chapter = _.findWhere(theBook.chapters, {
            text: parseInt(jQuery(this).attr('data-id'))
        })
        let lowerChapter = _.findWhere(theBook.chapters, {
            number: (chapter.number + 1)
        })
        chapter.number++
        lowerChapter.number--
        jQuery('#book-chapter-list').html(tmp_book_chapter_list({
            theBook: theBook
        }))
    })

    jQuery(document).on('click', '.delete-chapter', function () {
        let thisChapter = _.findWhere(theBook.chapters, {
            text: parseInt(jQuery(this).attr('data-id'))
        })
        _.each(theBook.chapters, function (chapter) {
            if (chapter.number > thisChapter.number) {
                chapter.number--
            }
        })
        theBook.chapters = _.filter(theBook.chapters, function (
            chapter) {
            return (chapter !== thisChapter)
        })
        jQuery('#book-chapter-list').html(tmp_book_chapter_list({
            theBook: theBook
        }))
        jQuery('#book-document-list').html(tmp_book_document_list({
            theDocumentList: theDocumentList,
            theBook: theBook
        }))
    })

    jQuery(document).on('click', '#book-document-list td', function () {
        jQuery(this).toggleClass('checked')
    })

    jQuery(document).on('click', '#add-chapter', function () {
        jQuery('#book-document-list td.checked').each(function () {
            let documentId = parseInt(jQuery(this).attr(
                'data-id')),
                lastChapterNumber = _.max(theBook.chapters,
                    function (chapter) {
                        return chapter.number
                    }).number
            if (isNaN(lastChapterNumber)) {
                lastChapterNumber = 0
            }
            theBook.chapters.push({
                text: documentId,
                title: jQuery.trim(this.textContent),
                number: lastChapterNumber + 1,
                part: ''
            })
        })
        jQuery('#book-chapter-list').html(tmp_book_chapter_list({
            theBook: theBook
        }))
        jQuery('#book-document-list').html(tmp_book_document_list({
            theDocumentList: theDocumentList,
            theBook: theBook
        }))
    })

    jQuery(document).on('click', '.edit-chapter', function () {
        let thisChapter = _.findWhere(theBook.chapters, {
            text: parseInt(jQuery(this).attr('data-id'))
        })
        editChapterDialog(thisChapter, theBook)
    })


    jQuery(document).on('click', '#select-cover-image-button', function () {
        selectCoverImageDialog(theBook,anImageDB)
        usermediaHelpers.startUsermediaTable()
    })

    jQuery(document).on('click', '#remove-cover-image-button', function () {
        delete theBook.cover_image
        jQuery('#figure-preview-row').html(tmp_book_epub_data_cover({
            'theBook': theBook
        }))
    })

    function getFormData() {
        theBook.title = jQuery('#book-title').val()
        theBook.metadata.author = jQuery('#book-metadata-author').val()
        theBook.metadata.subtitle = jQuery('#book-metadata-subtitle').val()
        theBook.metadata.copyright = jQuery('#book-metadata-copyright')
            .val()
        theBook.metadata.publisher = jQuery('#book-metadata-publisher')
            .val()
        theBook.metadata.keywords = jQuery('#book-metadata-keywords').val()
    }

    jQuery('body').append(dialogBody)

    jQuery('#book-settings-citationstyle').dropkick({
        change: function (value, label) {
            theBook.settings.citationstyle = value
        }
    })

    jQuery('#book-settings-documentstyle').dropkick({
        change: function (value, label) {
            theBook.settings.documentstyle = value
        }
    })

    jQuery('#book-settings-papersize').dropkick({
        change: function (value, label) {
            theBook.settings.papersize = value
        }
    })
    let diaButtons = {}
    if (theBook.rights === "w") {
        diaButtons[gettext('Submit')] = function () {
            getFormData()

            saveBook(theBook, theOldBook, this)

        }
        diaButtons[gettext('Cancel')] = function () {
            jQuery(this).dialog("close")
        }
    } else {
        diaButtons[gettext('Close')] = function () {
            jQuery(this).dialog("close")
        }
    }
    jQuery('#book-dialog').dialog({
        draggable: false,
        resizable: false,
        top: 10,
        width: 820,
        height: 590,
        modal: true,
        buttons: diaButtons,
        create: function () {
            let theDialog = jQuery(this).closest(".ui-dialog")
            theDialog.find(".ui-button:first-child").addClass(
                "fw-button fw-dark")
            theDialog.find(".ui-button:last").addClass(
                "fw-button fw-orange")
        },
        close: function () {
            jQuery(document).off('click', '#add-chapter')
            jQuery(document).off('click', '.book-sort-up')
            jQuery(document).off('click', '.book-sort-down')
            jQuery(document).off('click', '#add-chapter')
            jQuery(document).off('click', '#book-document-list td')
            jQuery(document).off('click', '.delete-chapter')
            jQuery(document).off('click', '.edit-chapter')
            jQuery(document).off('click',
                '#select-cover-image-button')
            jQuery(document).off('click',
                '#remove-cover-image-button')
            jQuery('#book-dialog').dialog('destroy').remove()
        }
    })

    jQuery('#bookoptionsTab').tabs()
}