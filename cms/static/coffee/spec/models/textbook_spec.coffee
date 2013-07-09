beforeEach ->
    @addMatchers
        toBeInstanceOf: (expected) ->
            return @actual instanceof expected


describe "CMS.Models.Textbook", ->
    beforeEach ->
        @model = new CMS.Models.Textbook()

    it "should have an empty name by default", ->
        expect(@model.get("name")).toEqual("")

    it "should not show chapters by default", ->
        expect(@model.get("showChapters")).toBeFalsy()

    it "should have a ChapterSet with one chapter by default", ->
        chapters = @model.get("chapters")
        expect(chapters).toBeInstanceOf(CMS.Collections.ChapterSet)
        expect(chapters.length).toEqual(1)

    it "should be empty by default", ->
        expect(@model.isEmpty()).toBeTruthy()


describe "CMS.Models.Textbook input/output", ->
    # replace with Backbone.Assocations.deepAttributes when
    # https://github.com/dhruvaray/backbone-associations/pull/43 is merged
    deepAttributes = (obj) ->
        if obj instanceof Backbone.Model
            deepAttributes(obj.attributes)
        else if obj instanceof Backbone.Collection
            obj.map(deepAttributes);
        else if _.isArray(obj)
            _.map(obj, deepAttributes);
        else if _.isObject(obj)
            attributes = {};
            for own prop, val of obj
                attributes[prop] = deepAttributes(val)
            attributes
        else
            obj

    it "should match server model to client model", ->
        serverModelSpec = {
            "tab_title": "My Textbook",
            "chapters": [
                {"title": "Chapter 1", "url": "/ch1.pdf"},
                {"title": "Chapter 2", "url": "/ch2.pdf"},
            ]
        }
        clientModelSpec = {
            "name": "My Textbook",
            "showChapters": false,
            "chapters": [{
                    "name": "Chapter 1",
                    "asset_path": "/ch1.pdf",
                    "order": 1
                }, {
                    "name": "Chapter 2",
                    "asset_path": "/ch2.pdf",
                    "order": 2
                }
            ]
        }

        model = new CMS.Models.Textbook(serverModelSpec, {parse: true})
        expect(deepAttributes(model)).toEqual(clientModelSpec)
        expect(model.toJSON()).toEqual(serverModelSpec)

describe "CMS.Collections.TextbookSet", ->
    beforeEach ->
        window.TEXTBOOK_URL = "/textbooks"
        @collection = new CMS.Collections.TextbookSet()

    afterEach ->
        delete window.TEXTBOOK_URL

    it "should have a url set", ->
        expect(_.result(@collection, "url"), window.TEXTBOOK_URL)

    it "can call save", ->
        spyOn(@collection, "sync")
        @collection.save()
        expect(@collection.sync).toHaveBeenCalledWith("update", @collection, undefined)

    it "should respond to editOne events", ->
        model = new CMS.Models.Textbook()
        @collection.trigger('editOne', model)
        expect(@collection.editing).toEqual(model)


describe "CMS.Models.Chapter", ->
    beforeEach ->
        @model = new CMS.Models.Chapter()

    it "should have a name by default", ->
        expect(@model.get("name")).toEqual("")

    it "should have an asset_path by default", ->
        expect(@model.get("asset_path")).toEqual("")

    it "should have an order by default", ->
        expect(@model.get("order")).toEqual(1)

    it "should be empty by default", ->
        expect(@model.isEmpty()).toBeTruthy()


describe "CMS.Collections.ChapterSet", ->
    beforeEach ->
        @collection = new CMS.Collections.ChapterSet()

    it "is empty by default", ->
        expect(@collection.isEmpty()).toBeTruthy()

    it "is empty if all chapters are empty", ->
        @collection.add([{}, {}, {}])
        expect(@collection.isEmpty()).toBeTruthy()

    it "is not empty if a chapter is not empty", ->
        @collection.add([{}, {name: "full"}, {}])
        expect(@collection.isEmpty()).toBeFalsy()

    it "should have a nextOrder function", ->
        expect(@collection.nextOrder()).toEqual(1)
        @collection.add([{}])
        expect(@collection.nextOrder()).toEqual(2)
        @collection.add([{}])
        expect(@collection.nextOrder()).toEqual(3)
        # verify that it doesn't just return an incrementing value each time
        expect(@collection.nextOrder()).toEqual(3)
        # try going back one
        @collection.remove(@collection.last())
        expect(@collection.nextOrder()).toEqual(2)
