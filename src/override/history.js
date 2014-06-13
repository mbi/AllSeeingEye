$(function() {

    var itemHTML = "<div class='span12 pug-item'>\
                            <div class='matte-media-box pug-box'>\
                                <img class='pug linkable' src='%img'>\
                                <div class='caption'>\
                                    <h4 class='caption-name ellipsis'>%title</h4>\
                                    <p class='caption-text'>Last visited: %date</p>%exactMatch\
                                </div>\
                                <a class='magnify' title='View Snapshot'>\
                                    <i class='icon icon-magnify magnify-inner' style='color:black'></i>\
                                </a>\
                                <span data-url='%url'></span>\
                            </div>\
                        </div>"

    var lists;

    function handleMagnify() {
        var src = $(this).parent().find('img').attr("src")
        var imgWindow = window.open(src,"_blank");
        imgWindow.focus();
    }

    function handleLinkable() {
        var url = $(this).parent().find('span').data("url")
        var imgWindow = window.open(url,"_blank");
        imgWindow.focus();
    }

    function getList(fragment) {

        return new infinity.ListView(
            fragment
                .clone(true)
                .appendTo(fragment.parent())
                .removeAttr("fragment")
                .attr("frag","")
                .find('.infinityListContainer')
        )
    }

    function newLists(fragment) {

        if (fragment.siblings()[0]) {
            // no events attached to fragment root so just remove those of descendants
            fragment.siblings().find("*").off()
            // remove fragment
            fragment.siblings().remove()
        }

        var ls = []

        for (var n = 0; n < 3; n++) {
            ls[n] = getList(fragment)
        }

        return ls
    }

    function addItem(html, list, pre) {
        list[pre?"prepend":"append"]($(html))
    }

    function template(json, t) {

        var html = t.replace(/%(\w+)/g, function(m, sm) {

            return json[sm] === undefined ? "" : json[sm]
        })

        return html
    }

    function showAll(listFragment, initFragment) {

        slotBottom = 0, slotTop = 0;

        chrome.runtime.sendMessage(
            {
                from: "history",
                action: "showAll"
            }, function(r) {
                if (!r) {
                    initFragment
                        .clone(true)
                        .appendTo(initFragment.parent())
                        .removeAttr("fragment")
                        .attr("frag", "remove-me")
                }
            }
        );
    }

    function search(tags, text, numWords, listFragment, initFragment, nullResultFragment) {

        slotBottom = 0, slotTop = 0;

        chrome.runtime.sendMessage(
            {
                from: "history",
                action: "search",
                tags: tags,
                text: text,
                numWords: numWords
            }, function(r) {
                if (r.result === "not found") {
                    nullResultFragment
                        .clone(true)
                        .appendTo(nullResultFragment.parent())
                        .removeAttr("fragment")
                        .attr("frag", "remove-me")
                    return
                }

                if (r.result === "no items") {
                    initFragment
                        .clone(true)
                        .appendTo(initFragment.parent())
                        .removeAttr("fragment")
                        .attr("frag", "remove-me")
                    return
                }
            }
        );
    }

    var lastInput;

    function handleSearch() {

        var text = $('.input')
                        .val()
                        .toLowerCase()
                        .replace(new RegExp("[ \\f\\n\\r\\t\\v\\u00A0\\u2028\\u2029\"_\-]+", "gm"), " ")
                        .replace(/[']+/g, "")
                        .trim() || ""

        if (text === lastInput) {
            return
        }
        lastInput = text;

        var words = text && text.match(/([\w]+)/g)

        var tags = words && NLP.unique(NLP.stop(words)).map(function(v, i) { return NLP.stem(v)}).splice(0,24) || []

        $('[frag="remove-me"]').remove()

        lists = newLists($('[fragment].listContainer'))

        if (tags[0]) {
            search(tags, text, words.length> 1 ? true : false, $('[fragment].listContainer'), $('[fragment].init'), $('[fragment].nullResult'))
        }  else if (text) {
            $('[fragment].nullResult')
                .clone(true)
                .appendTo($('[fragment].nullResult').parent())
                .removeAttr("fragment")
                .attr("frag", "remove-me")
        }  else {
            showAll($('[fragment].listContainer'), $('[fragment].init'))
        }

    }

    $(document).on('click touchend', '.search', handleSearch)
    $('.input').keyup(function(e) {
        if (!$(this).val() || e.which == 13 ) {
            handleSearch()
        }
    })

    $(document).on('click touchend', '.magnify', handleMagnify)

    $(document).on('click touchend', '.linkable', handleLinkable)

    setTimeout(function() {
        lists = newLists($('[fragment].listContainer'))
        showAll($('[fragment].listContainer'), $('[fragment].init'))
    }, 500)

    var slotBottom = 0, slotTop = 0;

    chrome.runtime.onMessage.addListener(function(msg, sender) {

        if (msg.from !== "bg") {
            return
        }

        if (msg.action === "prepend") {
            if (msg.data) {
                addItem(template(msg.data, itemHTML), lists[slotTop], true)
                slotTop++
                if (slotTop === 3) {
                    slotTop = 0
                }
            }
        }

        if (msg.action === "append") {
            if (msg.data) {
                addItem(template(msg.data, itemHTML), lists[slotBottom])
                slotBottom++
                if (slotBottom === 3) {
                    slotBottom = 0
                }
            }
        }

    });

})



