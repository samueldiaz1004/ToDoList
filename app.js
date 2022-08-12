const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

//////////////////////////DB Connection////////////////////////////////

mongoose.connect(process.env.DB);

const itemsSchema = {
    name: String
};

const Item =  mongoose.model("item", itemsSchema);

const item1 = new Item({name: "Welcome!"});
const item2 = new Item({name: "Hit '+' to add a new item"});
const item3 = new Item({name: "Hit '<--' to delete an item"});

const defaultItems = [item1, item2, item3];

const listSchema = {
    name: String,
    items: [itemsSchema]
};

const List = mongoose.model("List", listSchema);

///////////////////////////////////////////////////////////////////////

app.get("/", async (req,res) =>  {

    Item.find({}, (err, items) => {
        // Add defaut items to the db if it is empty
        if(items.length === 0){
            Item.insertMany(defaultItems, (err) => {
                if(err){
                    console.log(err);
                }
                else{
                    console.log("Items saved");
                }
            });
            res.redirect("/");
        }
        // Load the existing items in the DB
        else{
            res.render("list", {listTitle: "Today", newListItems: items});
        }
    });
  
});

app.post("/", async (req,res) => {

    const itemName = req.body.newItem;
    const listName = _.trim(req.body.list); // For some reason it returns an additional space at the end

    const item = new Item({name: itemName});

    if(listName === "Today"){
        await item.save();
        res.redirect("/");
    }
    else{
        const data = await List.findOne({name: listName});
        data.items.push(item);
        await data.save();
        res.redirect("/"+listName);
    }

});

app.post("/delete", async (req, res) => {
    const json = JSON.parse(req.body.obj);
    const checkedItemId = json.itemId;
    const listName = json.listName;
        
    if(listName === "Today"){
        Item.deleteOne({_id: checkedItemId}, (err) => {
            if(!err){
                res.redirect("/");
            }
        });
    }
    else{
        List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}}, (err, foundList) => {
            if(!err){
                res.redirect("/"+listName);
            }
        });
    }

});

app.get("/about", async (req,res) => {
    res.render("about");
});

app.get('/favicon.ico', async (req, res) => res.status(204).end()); // Avoid Creating a list collection after the favicon

app.get("/:customListName", async (req,res) => {
    const customListName = _.capitalize(req.params.customListName);

    let data = await List.findOne({name: customListName});
    if(!data){
        // Create new list
        const list = new List({name: customListName, items: defaultItems});
        await list.save();
        res.redirect("/"+customListName,);
    }
    else{
        // Show existing list
        res.render("list", {listTitle: data.name, newListItems: data.items});
    }
});

let port = process.env.PORT;
if(port === null || port === ""){
    port = 3000;
}

app.listen(port, () => {
    console.log("Running sucessfully");
});