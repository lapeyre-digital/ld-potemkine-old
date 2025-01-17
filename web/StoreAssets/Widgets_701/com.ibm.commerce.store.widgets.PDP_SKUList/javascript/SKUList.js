//-----------------------------------------------------------------
// Licensed Materials - Property of IBM
//
// WebSphere Commerce
//
// (C) Copyright IBM Corp. 2014, 2016 All Rights Reserved.
//
// US Government Users Restricted Rights - Use, duplication or
// disclosure restricted by GSA ADP Schedule Contract with
// IBM Corp.
//-----------------------------------------------------------------

/**
 *@fileOverview This javascript file defines all the javascript functions used by SKU List widget
 */

SKUListJS = {

	/** 
	 * This variable stores the ID of the language that the store currently uses. Its default value is set to -1, which corresponds to United States English.
	 * @private
	 */
	langId: "-1",
	
	/** 
	 * This variable stores the ID of the current store. Its default value is empty.
	 * @private
	 */
	storeId: "",
	
	/** 
	 * This variable stores the ID of the catalog. Its default value is empty.
	 * @private
	 */
	catalogId: "",

	/** 
	 * If set to true, then the SKU compare box will be shown. Its default value is true.
	 * @private
	 */
	disableProductCompare: "",
	
	/** 
	 * This array stores the products which quantities have been updated (and can be added to the cart). Its default value is empty.
	 * @private
	 */
	quantityList: {},
	
	/**
	 * This variable stores the onmousedown event dojo.connect handle.
	 */
	mouseOverConnectHandle: null,
	
	/**
	 * Sets the common parameters for the current page. 
	 * For example, the language ID, store ID, and catalog ID.
	 *
	 * @param {Integer} langId The ID of the language that the store currently uses.
	 * @param {Integer} storeId The ID of the current store.
	 * @param {Integer} catalogId The ID of the catalog.
	 * @param {Integer} disableProductCompare If set to true, will disable product compare.
	 */
	setCommonParameters:function(langId, storeId, catalogId, disableProductCompare){
		this.langId = langId;
		this.storeId = storeId;
		this.catalogId = catalogId;
		this.disableProductCompare = disableProductCompare;
	},

	/**
	 * Updates the quantities of the SKU if the quantities are changed.
	 * @param (string) qty The quantity value to update to.
	 * @param (string) productId The ID of the product.
	 * @param (string) itemId The ID of the item.
	 */
	updateItemQuantity: function (qty, productId, itemId) {
		if (!(productId in this.quantityList)) {
			this.quantityList[productId] = {};
		}
		
		if (qty.replace(/^\s+|\s+$/g, '') == '') {
			this.removeItemQuantity(productId, itemId);
			dojo.style('invalidQuantity_' + productId + '_' + itemId, 'display', 'none');
			return;
		} 
		
		if (!isPositiveInteger(qty)){
			dojo.style('invalidQuantity_' + productId + '_' + itemId, 'display', 'block');
		} else {
			dojo.style('invalidQuantity_' + productId + '_' + itemId, 'display', 'none');
		}
		
		this.quantityList[productId][itemId] = qty;
	},
	
	/**
	 * Validate item quantity.
	 * @param (string) qty The quantity value to update to.
	 * @param (string) skuId The ID of the sku.
	 */
	validateQuantity: function (qty, skuId) {
		if (qty.replace(/^\s+|\s+$/g, '') != '' && !isPositiveInteger(qty)) {
			dojo.style('invalidQuantity_' + skuId, 'display', 'block');
		} else {
			dojo.style('invalidQuantity_' + skuId, 'display', 'none');
		}
	},
	
	/**
	 * Remove the quantity of the SKU (e.g. when row is hidden)
	 * @param (string) productId The ID of the product.
	 * @param (string) itemId The ID of the item.
	 */
	removeItemQuantity: function (productId, itemId) {
		if (productId in this.quantityList) {
			delete this.quantityList[productId][itemId];
		}
	},
	
	/**
	 * Remove all quantities currently inputed, e.g. after successfully added to shopping cart or req list 
	 */
	removeAllQuantities: function () {
		var quantityFields = dojo.query(".productDetailTable .Quantity .input_field");
		
		for (var i = 0; i < quantityFields.length; i++) {
			quantityFields[i].value = "";
			quantityFields[i].onchange();
		}
	},
	
	/**
	 * Checks if the string is an integer.
	 * @param (string) str The string to check.
	 * @return (boolean) Indicates whether the string is a number.
	 */
	isNumber: function (str) {
		if ((str*0)==0) return true;
		else return false;
	},	
	
	/**
	 * Checks if a string is null or empty.
	 * @param (string) str The string to check.
	 * @return (boolean) Indicates whether the string is empty.
	 */
	isEmpty: function(str) {
		var reWhiteSpace = new RegExp(/^\s+$/);
		if (str == null || str =='' || reWhiteSpace.test(str) ) {
			return true;
		}
		return false;
	},
	
	/**
	 * Redirects to the store locator after appending the current URL
	 * @param storeLocatorUrl The store locator URL
	 */
	selectStore: function(storeLocatorUrl){
		setPageLocation(storeLocatorUrl + "&fromUrl=" + encodeURIComponent(document.URL));
	},
	
	/**
	 * Checks the online inventory status in the stores selected by the user
	 * @param productId The product ID
	 * @param type The product type 
	 */
	checkOnlineAvailability: function(productId){
		var params = {};
		params.productId = productId;
		params.storeId = this.storeId;
		params.catalogId = this.catalogId;
		params.langId = this.langId;
		
		var url = appendWcCommonRequestParameters("GetOnlineInventoryStatusByIDView");
		cursor_wait();
		
		dojo.xhrPost({
				url: url,
				handleAs: "json-comment-filtered",
				content: params,
				service: this,
				load: this.populateOnlineInvDetails,
				error: function(errObj,ioArgs) {
					MessageHelper.displayErrorMessage(storeNLS["INV_STATUS_RETRIEVAL_ERROR"]);
					cursor_clear();
				}
		});
	},
	
	/**
	* Populate the contents of the online store inventory details section with the JSON returned 
	* from the server. This is the callback function that is called after the AJAX call to get the online
	* inventory details successfully returns to the client.
	* 
	* @param {Object} serviceResponse response object from dojo.xhrPost
	* @param {dojo.__IoCallbackArgs} ioArgs Argument to the IO call from dojo.xhrPost
	*/
	populateOnlineInvDetails: function(serviceResponse, ioArgs) {
		if(serviceResponse.onlineInventory){			
			var listTable = "WC_Sku_List_Table_" + ioArgs.args.content.productId;
			
			// Removing the online availability if present
			dojo.query(".OnlineAvailability.gridCell > div, .OnlineAvailability.rightCol > div", listTable).orphan();
			
			var fullInvCells = dojo.query(".gridCell[data-filter=\"OnlineAvailability\"]", listTable);
			var mobileInvCells = dojo.query(".OnlineAvailability.rightCol", listTable);
			
			var i = 0;
			for (var item in serviceResponse.onlineInventory) {
				if (typeof fullInvCells[i] != 'undefined') {
					dojo.place("<div id='WC_Online_Inventory_Section_" + item + "' class='cell'>", fullInvCells[i]);
					dojo.place("<span> <img src='" + imageDirectoryPath + styleDirectoryPath + serviceResponse.onlineInventory[item].image 
							+ "' alt='" + serviceResponse.onlineInventory[item].altText + "' /> </span>", "WC_Online_Inventory_Section_" + item);
					dojo.place("<span>" + serviceResponse.onlineInventory[item].status + "</span>", "WC_Online_Inventory_Section_" + item);
					dojo.place("<div id='WC_Online_Inventory_Mobile_Section_" + item + "'>", mobileInvCells[i++]);
					dojo.place("<span> <img src='" + imageDirectoryPath + styleDirectoryPath + serviceResponse.onlineInventory[item].image 
							+ "' alt='" + serviceResponse.onlineInventory[item].altText + "' /> </span>", "WC_Online_Inventory_Mobile_Section_" + item);
					dojo.place("<span>" + serviceResponse.onlineInventory[item].status + "</span>", "WC_Online_Inventory_Mobile_Section_" + item);
				}
			}
		} else {
			MessageHelper.displayErrorMessage(storeNLS["INV_STATUS_RETRIEVAL_ERROR"]);
		}
		cursor_clear();
	},
	
	/**
	* Populate the select stores/check stores link depending on whether or not
	* a physical store has been selected
	*/
	populateStoreLinks: function() {
		var cookieValue = dojo.cookie("WC_physicalStores");
		
		if (cookieValue != null) {
			dojo.query(".check_stores.link").removeClass("nodisplay");
		} else {
			dojo.query(".select_stores.link").removeClass("nodisplay");
		}
	},
	
	/**
	 * Checks the inventory status in the stores selected by the user
	 * @param productId The product ID
	 * @param itemId The item ID 
	 */
	checkAvailability: function(productId, itemId){
		var params = {};
		params.productId = productId;
		params.itemId = itemId;
		
		// For Handling multiple clicks.
		if (!submitRequest()) {
			return;
		}
			
		var url = appendWcCommonRequestParameters("GetInventoryStatusByIDView");
		cursor_wait();
		
		dojo.xhrPost({
				url: url,
				handleAs: "json-comment-filtered",
				content: params,
				service: this,
				load: this.populateInvDetails,
				error: function(errObj,ioArgs) {
					MessageHelper.displayErrorMessage(storeNLS["INV_STATUS_RETRIEVAL_ERROR"]);
					cursor_clear();
				}
		});
	},
	
	/**
	* Populate the contents of the in store inventory details section with the JSON returned 
	* from the server. This is the callback function that is called after the AJAX call to get the inventory 
	* details successfully returns to the client.
	* 
	* @param {Object} serviceResponse response object from dojo.xhrPost
	* @param {dojo.__IoCallbackArgs} ioArgs Argument to the IO call from dojo.xhrPost
	*/
	populateInvDetails: function(serviceResponse, ioArgs) {
		if(serviceResponse.inStoreInventory){			
			// Removing the in store section if present
			dojo.query("#WC_InStore_Inventory_Section_" + this.content.itemId).orphan();
			dojo.query("#WC_InStore_Mobile_Inventory_Section_" + this.content.itemId).orphan();

			
			// Adding the empty store section
			dojo.place("<div id='WC_InStore_Inventory_Section_" + this.content.itemId + "' class='sublist'>", 
					"WC_Check_Stores_Link_" + this.content.itemId, "before");
			dojo.place("<div id='WC_InStore_Mobile_Inventory_Section_" + this.content.itemId + "' class='sublist'>", 
					"WC_Check_Stores_Link_Mobile_" + this.content.itemId, "before");
			
			this.service.physicalStores = serviceResponse.inStoreInventory.stores;
			
			// Adding the store inventory details as child elements in the store section
			for(i = 0; i < serviceResponse.inStoreInventory.stores.length; i++){
				var store = serviceResponse.inStoreInventory.stores[i];
				
				// Adding the store name
				dojo.place("<a id='WC_InStore_Inventory_Link_" + this.content.itemId + "_store_" + (i+1) 
						+ "' href='#' onclick=\"SKUListJS.fetchStoreDetails('" + store.id + "', '" + this.content.productId + "');\" class='store_name'>" 
						+ store.name + "&nbsp;</a>", "WC_InStore_Inventory_Section_" + this.content.itemId);
				dojo.place("<a id='WC_InStore_Mobile_Inventory_Link_" + this.content.itemId + "_store_" + (i+1) 
						+ "' href='#' onclick=\"SKUListJS.fetchStoreDetails('" + store.id + "', '" + this.content.productId + "');\" class='store_name'>" 
						+ store.name + "&nbsp;</a>", "WC_InStore_Mobile_Inventory_Section_" + this.content.itemId);
				// Adding clear div
				dojo.place("<div class='clear_float'></div>", "WC_InStore_Inventory_Section_" + this.content.itemId);
				dojo.place("<div class='clear_float'></div>", "WC_InStore_Mobile_Inventory_Section_" + this.content.itemId);
				// Adding the image status of store name
				dojo.place("<span> <img src='" + imageDirectoryPath + styleDirectoryPath + store.image 
						+ "' alt='" + store.altText + "' /> </span>", "WC_InStore_Inventory_Section_" + this.content.itemId);
				dojo.place("<span> <img src='" + imageDirectoryPath + styleDirectoryPath + store.image 
						+ "' alt='" + store.altText + "' /> </span>", "WC_InStore_Mobile_Inventory_Section_" + this.content.itemId);
				// Adding the text status of store name
				dojo.place("<span class='text'>" + store.statusText + "</span>", "WC_InStore_Inventory_Section_" + this.content.itemId);
				dojo.place("<span class='text'>" + store.statusText + "</span>", "WC_InStore_Mobile_Inventory_Section_" + this.content.itemId);
				// Adding spacer
				dojo.place("<div class='item_spacer_10px'></div>", "WC_InStore_Inventory_Section_" + this.content.itemId);
				dojo.place("<div class='item_spacer_10px'></div>", "WC_InStore_Mobile_Inventory_Section_" + this.content.itemId);
			}

			// Change the link from Check Stores to Change Stores
			dojo.addClass("WC_Check_Stores_Link_" + this.content.itemId, "nodisplay");
			dojo.removeClass("WC_Change_Stores_Link_" + this.content.itemId, "nodisplay");
			dojo.addClass("WC_Check_Stores_Link_Mobile_" + this.content.itemId, "nodisplay");
			dojo.removeClass("WC_Change_Stores_Link_Mobile_" + this.content.itemId, "nodisplay");
		} else {
			MessageHelper.displayErrorMessage(storeNLS["INV_STATUS_RETRIEVAL_ERROR"]);
		}
		cursor_clear();
	},
	
	/**
	 * Show physical store details popup after fetching the required details
	 * @param storeId The ID of the physical store
	 * @param productId The ID of the product
	 */
	fetchStoreDetails: function(storeId, productId){
		MessageHelper.hideAndClearMessage();
		
		var params = {};
		params.physicalStoreId = storeId;
		params.productId = productId;
		
		var url = appendWcCommonRequestParameters("GetStoreDetailsByIDView");
		
		// For Handling multiple clicks.
		if(!submitRequest()){
			return;
		}
		cursor_wait();
		dojo.xhrPost({
				url: url,
				handleAs: "json-comment-filtered",
				content: params,
				service: this,
				load: this.populateStoreDetails,
				error: function(errObj,ioArgs) {
					MessageHelper.displayErrorMessage(storeNLS["INV_STATUS_RETRIEVAL_ERROR"]);
					cursor_clear();
				}
		});
	},
	
	/**
	* Populate the contents of the store details section in the product display page with the JSON returned 
	* from the server. This is the callback function that is called after the AJAX call to get the inventory 
	* details successfully returns to the client.
	* 
	* @param {Object} serviceResponse response object from dojo.xhrPost
	* @param {dojo.__IoCallbackArgs} ioArgs Argument to the IO call from dojo.xhrPost
	*/
	populateStoreDetails: function(serviceResponse, ioArgs){
		var store = serviceResponse;
		
		// Get unescaped working hours
		store.hours = this.service.unEscapeXml(serviceResponse.hours);
		
		// Get inventory status
		var storeInventory = this.service.fetchInventoryStatus(this.content.physicalStoreId);

		// Get store availability details
		store.imageTag = "<img src='"+imageDirectoryPath + styleDirectoryPath +storeInventory.image+"' alt='"+storeInventory.altText+"'/>";
		store.statusText = storeInventory.statusText;
		
		if(storeInventory.status == 'Available'){
			store.availabilityDetails = "(" + storeInventory.availableQuantity + ")"; // Adding the available quantity
		} else if(storeInventory.status == 'Backorderable'){
			store.availabilityDetails = "(" + storeInventory.availableDate + ")"; // Adding the available date
		} else {
			store.availabilityDetails = "";
		}
		
		var storeDetails = dojo.byId("Store_Details_Template_" + this.content.productId).innerHTML;
		dojo.byId("Store_Details_" + this.content.productId).innerHTML = dojo.replace(storeDetails, store);
		
		// Display store details
		var popup = dijit.byId("InventoryStatus_Store_Details_" + this.content.productId);
		if (popup != null) {			
			popup.closeButtonNode.style.display='none'; // Hide the close button inherited from dijit.dialog		
			closeAllDialogs(); // Close other dialogs(quickinfo dialog, etc) before opening this. 				
			popup.show();
		}else {
			console.debug("InventoryStatus_Store_Details_" + this.content.productId + " does not exist");
		}
		cursor_clear();
	},
	
	/**
	 * Returns the inventory status object for the physical store specified
	 * @param storeId The storeId of the physical store
	 * @return the inventory status object for the store
	 */
	fetchInventoryStatus: function(storeId) {
		for(i = 0; i < this.physicalStores.length; i++){
			if(this.physicalStores[i].id == storeId){
				return this.physicalStores[i];
			}
		}
		return {};
	},
	
	/**
	 * Converts xml accepted form to < >
	 * @param {String} str, String to be converted
	 * @return {String} converted string
	 */
	unEscapeXml: function(str){
		return str.replace(/&lt;/gm, "<").replace(/&gt;/gm, ">");
	},
	
	/**
	* Show SKU list table (e.g. when button is clicked)
	* @param productId the ID of the product
	**/
	showTable: function(productId, top_category, parent_category_rn, categoryId, widgetPrefix) {
		//For Handling multiple clicks
		if (!submitRequest()) {
			return;
		}   
		var skuListWidget = dijit.byId("WC_Sku_List_Table_" + productId);
		if (skuListWidget) {
			cursor_wait();
			skuListWidget.refresh({"catalogId":this.catalogId,"storeId":this.storeId, "productId":productId, "disableProductCompare":this.disableProductCompare, "jspStoreImgDir":imageDirectoryPath, "top_category":top_category, "parent_category_rn":parent_category_rn, "categoryId":categoryId, "widgetPrefix":widgetPrefix});
		}
		var domHas = require("dojo/has");
		if ((domHas("ie") < 9)) {
			dojo.byId("lastShowSKUList").value = productId;				
			this.mouseOverConnectHandle = dojo.connect(dojo.byId("WC_Sku_List_Table_Hide_Button_" + productId), "onmouseover", this, "handleMouseOver");
		}		
	},
	
	handleMouseOver: function(){
		var productId = dojo.byId("lastShowSKUList").value;	
		var node = dojo.byId("product_name_" + productId);
		var productInfoHeight = 0;	
		while(node != null && node.tagName != "LI"){
			node = node.parentNode;
			if (node.className == "product_info"){
				productInfoHeight = node.offsetHeight;
			}
		}
		if(productInfoHeight > 280){
			node.style.height = productInfoHeight + 40 + "px";
		}
		SKUListJS.arrangeProductDetailTables();			
	},
	
	/**
	* Show the display of SKU list table and change the button to hide
	* @param widget the refresh area widget
	**/
	showTableView: function(widget) {
		dojo.removeClass(widget.domNode, 'nodisplay');
		var productId = widget.domNode.id.replace("WC_Sku_List_Table_", "");
		dojo.addClass('WC_Sku_List_Table_Full_' + productId, 'expanded');
		dojo.addClass('WC_Sku_List_Table_Expand_Area_' + productId, 'hide');
		dojo.addClass('WC_Sku_List_Table_Show_Button_' + productId, 'nodisplay');
		dojo.removeClass('WC_Sku_List_Table_Hide_Button_' + productId, 'nodisplay');
		dojo.byId("WC_Sku_List_Table_Hide_Button_" + productId).focus();
	},
	
	/**
	* Hide the display of SKU list table and change the button to show
	* @param widget the refresh area widget
	**/
	hideTableView: function(productId) {
		dojo.addClass('WC_Sku_List_Table_' + productId, 'nodisplay');
		dojo.removeClass('WC_Sku_List_Table_Expand_Area_' + productId, 'hide');
		dojo.addClass('WC_Sku_List_Table_Hide_Button_' + productId, 'nodisplay');
		dojo.removeClass('WC_Sku_List_Table_Show_Button_' + productId, 'nodisplay');
		dojo.byId("WC_Sku_List_Table_Show_Button_" + productId).focus();
		if (this.mouseOverConnectHandle != null) {
			dojo.disconnect(this.mouseOverConnectHandle);
			this.mouseOverConnectHandle = null;
		}
	},

	/**
	* Toggle expanded content to show or hide (e.g. when button is clicked)
	* @param productId the ID of the product
	* @param row The row on which the expanded content is contained
	* @param skuId The SKU id of the sku which the row contains
	**/
	toggleExpandedContent : function(productId, row, skuId) {
		dojo.toggleClass('WC_Sku_List_ExpandedContent_' + productId + '_' + row, 'nodisplay');
		dojo.toggleClass('WC_Sku_List_Mobile_ExpandedContent_' + productId + '_' + row, 'nodisplay');
		dojo.toggleClass('WC_Sku_List_Row_Header_Mobile_' + skuId, 'expanded');
		dojo.toggleClass('WC_Sku_List_Title_Mobile_' + productId + '_' + row, 'expanded');
		dojo.toggleClass('DropDownArrow_' + productId + '_' + row, 'expanded');
		dojo.toggleClass('DropDownArrow_Mobile_' + productId + '_' + row, 'expanded');
		dojo.toggleClass('DropDownButton_' + productId + '_' + row, 'expanded');
		dojo.toggleClass('DropDownButton_Mobile_' + productId + '_' + row, 'expanded');
		
		if (dojo.attr('DropDownButton_' + productId + '_' + row, 'aria-expanded') == 'false') {
			dojo.attr('DropDownButton_' + productId + '_' + row, 'aria-expanded', 'true');
		} else {
			dojo.attr('DropDownButton_' + productId + '_' + row, 'aria-expanded', 'false');
		}
		
		if (dojo.attr('DropDownButton_Mobile_' + productId + '_' + row, 'aria-expanded') == 'false') {
			dojo.attr('DropDownButton_Mobile_' + productId + '_' + row, 'aria-expanded', 'true');
		} else {
			dojo.attr('DropDownButton_Mobile_' + productId + '_' + row, 'aria-expanded', 'false');
		}
	},
	
	/**
	 * Arranges the columns in all SKU list tables on the page. 
	 */
	arrangeProductDetailTables: function() {
		var listTables = dojo.query(".productDetailTable");
		
		// For each product detail table, get the productId from the element's ID
		for (var i = 0; i < listTables.length; i++) {
			var productId = listTables[i].id.replace("WC_Sku_List_Table_", "");
			this.arrangeProductDetailTable(productId);
		}
	},
	
	/**
	 * Arranges the columns in the SKU list table. If there is not enough space to show all attributes,
	 * some columns will be pushed into the hidden expandable content area.
	 * @param productId the productId
	 */
	arrangeProductDetailTable: function(productId) {
		// This is the font being used in the column headers for the SKU List widget
		var HEADER_FONT = "bold 12px sans-serif"
		
		/* This is the minumum pixel width a column can be. Once the width of the columns has 
		gone below this amount, then a column will be removed and pushed into expandable hidden row */
		var MIN_COL_WIDTH = 90;
		
		// This is the maximum pixel width a column can be. 
		var MAX_COL_WIDTH = 250;
		
		var container = dojo.byId("WC_Sku_List_Table_" + productId).parentElement;
		var listTable = dojo.byId("WC_Sku_List_Table_Full_" + productId);
		var mobileTable = dojo.byId("WC_Sku_List_Table_Mobile_" + productId);
		
		// Check if table is already expanded and visible
		if ((listTable == null || listTable.offsetHeight == 0) && (mobileTable == null || mobileTable.offsetHeight == 0)) {
			return;
		}

		// Show the mobile view when the width of the container is 540 px or less
		if (dojo.coords(container).w <= 540) {
			dojo.style(listTable, "display", "none");
			dojo.style(mobileTable, "display", "block");
		} else {
			dojo.style(listTable, "display", "block");
			dojo.style(mobileTable, "display", "none");
		}
		
		var rowWidth = dojo.coords(dojo.query(".row", listTable)[0]).w;
		
		// Get the set of anchored and unanchored columns
		var anchoredHeaders = dojo.query(".columnHeader.anchored", listTable);
		var anchoredCells = dojo.query(".gridCell.anchored", listTable);
		var unanchoredHeaders = dojo.query(".columnHeader.unanchored", listTable);
		var unanchoredCells = dojo.query(".gridCell.unanchored", listTable);
		
		// The remaining width of the table will be used for unanchored headers (10 pixel buffer, so that headers don't wrap) 
		var unanchoredWidth = rowWidth - 10;
		for (var i = 0; i < anchoredHeaders.length; i++) {
			unanchoredWidth -= dojo.coords(anchoredHeaders[i]).w;
		}
		
		// Get the total number of columns in the SKU list table
		var unanchoredColumnWidth = MAX_COL_WIDTH;
		var numOfColumnsToMove = 0;
		
		// Find the number of unanchored columns that can be shown 
		if (unanchoredWidth / unanchoredHeaders.length < MIN_COL_WIDTH) {
			numOfColumnsToMove = Math.ceil(unanchoredHeaders.length - (unanchoredWidth / MIN_COL_WIDTH));
			if (numOfColumnsToMove > unanchoredHeaders.length) {
				numOfColumnsToMove = unanchoredHeaders.length;
			}
		}
		
		// After finding out the number of columns needed to be moved, calculate the width of each unanchored column
		var numOfRemainingColumns = unanchoredHeaders.length - numOfColumnsToMove;
		if (numOfRemainingColumns > 0) {
			unanchoredColumnWidth = unanchoredWidth / numOfRemainingColumns;
			if (unanchoredColumnWidth > MAX_COL_WIDTH) {
				unanchoredColumnWidth = MAX_COL_WIDTH;
			}
		} else {
			unanchoredColumnWidth = 0;
		}

		var headersToMove = [];
		var recalculateWidths = false;
		var padding = 20;

		// Bring the compare header to the front of the list, so it will get moved last
		if (dojo.query(".columnHeader.unanchored [data-filter=\"Compare\"]", listTable).length != 0) {
			unanchoredHeaders.unshift(unanchoredHeaders.pop());
		}
		
		// Check if any columns have a string that is too long to display in the currently calculated widths, and move those first
		for (var i = 0; i < unanchoredHeaders.length; i++) {
			if (i >= unanchoredHeaders.length - numOfColumnsToMove) {
				headersToMove.push(unanchoredHeaders[i]);
			} else {
				var attrNode = unanchoredHeaders[i].firstElementChild || unanchoredHeaders[i].firstChild //For IE8
				var attributeName = attrNode.innerHTML.replace(/^\s+|\s+$/g, '');
				
				if (this.hasLongWord(attributeName, unanchoredColumnWidth - padding, HEADER_FONT)) {
					headersToMove.push(unanchoredHeaders[i]);
					numOfColumnsToMove--;
					recalculateWidths = true;
				}
			}
		}
		
		// If needed, recalculate the new unanchored column widths after moving a column that had a string that was too long
		if (recalculateWidths) {
			numOfRemainingColumns = unanchoredHeaders.length - headersToMove.length;
			if (numOfRemainingColumns > 0) {
				unanchoredColumnWidth = unanchoredWidth / numOfRemainingColumns;
				if (unanchoredColumnWidth > MAX_COL_WIDTH) {
					unanchoredColumnWidth = MAX_COL_WIDTH;
				}
			} else {
				unanchoredColumnWidth = 0;
			}
		}
		
		// Show all columns initially
		unanchoredHeaders.style('display', 'block');
		unanchoredCells.style('display', 'block');

		// Set the percentage width of each unanchored column
		dojo.query(".columnHeader.unanchored, .gridCell.unanchored", listTable).style('width', unanchoredColumnWidth + 'px');
		
		// Hide all expanded content initially		
		dojo.query(".expandedCol", listTable).style('display', 'none');

		// If all columns can be displayed, then hide the expanded content area and the drop down button
		if (headersToMove.length == 0) {
			dojo.query(".expandedContent", listTable).addClass('nodisplay');
			dojo.query(".expandButton", listTable).style('display', 'none');
			dojo.query(".dropDownArrow", listTable).removeClass('expanded');
		}

		// Hide the amount of columns that need to be moved
		for (var i = 0; i < headersToMove.length; i++) {
			dojo.query(".expandButton", listTable).style('display', 'block');
			
			if (dojo.indexOf(unanchoredHeaders, headersToMove[i]) != -1) {
				// Get the CSS classname for the column that will be moved to the expanded columns
				var className = dojo.attr(headersToMove[i], "data-filter");

				// Hide the main column for this CSS class
				var columnToHide = dojo.query(".columnHeader.unanchored[data-filter=\"" + className + "\"], .gridCell.unanchored[data-filter=\"" + className + "\"]", listTable);
				columnToHide.style('display', 'none');

				// Show the attribute in the expanded content section
				var expandedColumnsToShow = dojo.query(".expandedCol[data-filter=\"" + className + "\"]", listTable);
				expandedColumnsToShow.style('display', 'block');
							
				// Set the right border of the cells in the table depending on row width to display the table lines 
				// properly according to the number of columns.
				if(typeof(expandedColumnsToShow[0]) != 'undefined'){
					var expandedColWidth = dojo.coords(expandedColumnsToShow[0]).w;
					var expandedContentPadding = 40;
					var numOfExpandedColumns = Math.floor((rowWidth - expandedContentPadding) / expandedColWidth);
					if (numOfExpandedColumns > 1 && headersToMove.length > 1) {
						if (i % numOfExpandedColumns == numOfExpandedColumns - 1) {
							expandedColumnsToShow.style('borderRight', 'none');
						} else {
							expandedColumnsToShow.style('borderRight', '1px solid #ccc');
						}
					} else {
						expandedColumnsToShow.style('borderRight', 'none');
					}
				}
			}
		}
	},
	
	/**
	 * Checks if any words in a string is longer than maxWidth
	 * @param text The text string
	 * @param maxWidth The max width for any word
	 * @param font The font of the string
	 */
	hasLongWord: function(text, maxWidth, font) { 
		// Create a dummy canvas (render invisible with css)
		var c = document.createElement('canvas');

		if (!c.getContext) {
			return false;
		}

		var ctx = c.getContext('2d');
		// Set the context.font to the font that you are using
		ctx.font = font;
		
		if (ctx.measureText(text).width < maxWidth) { 
			return false; 
		}

		var words = text.split(' ');

		for (var w in words) {
			var word = words[w];
			var measure = ctx.measureText(word).width;
			
			if (measure > maxWidth) {
				return true;
			}
	    }
		
		return false;
	},

	/**
	 * Filters the SKU list so that only those with selected attributes are shown
	 * @param skuId the ID of the item
	 * @param productId the ID of the product
	 */
	filterSkusByAttribute: function(skuId, productId) {
		var listTable = dojo.byId("WC_Sku_List_Table_" + productId);
		var selectedAttributes = productDisplayJS.selectedAttributesList;
		var productKey = "entitledItem_" + productId; 
		
		if (productKey in selectedAttributes) {
			// Display all rows initially
			dojo.query(".row.entry, .mobileHeader", listTable).removeClass('nodisplay');		

			for (var attribute in selectedAttributes[productKey]) {
				// The value of the selected attribute
				var selectedAttrValue = selectedAttributes[productKey][attribute].replace(/^\s+|\s+$/g, '');
				
				if (selectedAttrValue != "") {
					// The CSS class of the attribute has no spaces or 's or "s
					var attrClass = attribute.replace(/ /g, "").replace(/'/g, "").replace(/"/g, "");
					
					// Get all cells from the column matching the selected attribute 
					//var attrCells = dojo.query(".gridCell." + attrClass, listTable);
					var attrCells = dojo.query("div[data-filter='" + attrClass + "'].gridCell", listTable);
					
					for (var i = 0; i < attrCells.length; i++) {
						// If the selected attribute is not the same as the value inside a matching cell 
						// found in the SKU list table, then remove the entire row and remove the quantities
						var attrTextNode = attrCells[i].firstElementChild || attrCells[i].firstChild //For IE8 
						if (selectedAttrValue != attrTextNode.innerHTML.replace(/^\s+|\s+$/g, '').replace(/"/g, productDisplayJS.search01)) {
							dojo.addClass(attrCells[i].parentNode, 'nodisplay');
							
							// Get the SKU ID of the row that we want to remove and remove the row in mobile view as well
							skuId = attrCells[i].parentNode.id.split("WC_Sku_List_Row_Content_")[1];
							dojo.addClass("WC_Sku_List_Row_Header_Mobile_" + skuId, 'nodisplay');
							
							var quantityInput = dojo.query(".input_field", attrCells[i].parentNode)[0];
							quantityInput.value = "";
							quantityInput.onchange();
						}
					}					
				}
			}
		}
	},
	
	/**
	* addSku2ShopCartAjax This function is used to add one SKU to the shopping cart using an AJAX call (from mobile view).
	* @param {String} productId the product Id being added to cart
	* @param {String} skuId the SKU Id being added to cart 	
	* @param {Object} customParams - Any additional parameters that needs to be passed during service invocation.
	**/
	addSku2ShopCartAjax : function(productId, skuId, customParams) {	
		if (browseOnly){
			MessageHelper.displayErrorMessage(storeNLS['ERROR_ADD2CART_BROWSE_ONLY']); 
			return;
		}
		
		var params = [];
		params.storeId = this.storeId;
		params.catalogId = this.catalogId;
		params.langId = this.langId;
		params.orderId = ".";
		// Remove calculations for performance
		// params.calculationUsage = "-1,-2,-5,-6,-7";
		params.inventoryValidation = "true";
		params.calculateOrder="0";
		var ajaxShopCartService = "AddOrderItem";
		
		shoppingActionsJS.productAddedList = new Object();
		
		var quantity = dojo.byId(skuId + "_Mobile_Quantity_Input").value;
		if (!isPositiveInteger(quantity)){
			MessageHelper.displayErrorMessage(storeNLS['QUANTITY_INPUT_ERROR']);
			return;
		}
		
		params["catEntryId"] = skuId;
		params["quantity"] = quantity;

		shoppingActionsJS.saveAddedProductInfo(quantity, productId, skuId, null);
		
		//Pass any other customParams set by other add on features
		if (customParams != null && customParams != 'undefined'){
			for (i in customParams){
				params[i] = customParams[i];
			}
			if (customParams['catalogEntryType'] == 'dynamicKit' ){
				ajaxShopCartService = "AddPreConfigurationToCart";
			}
		}

		var contractIdElements = document.getElementsByName('contractSelectForm_contractId');
		if (contractIdElements != null && contractIdElements != "undefined") {
			for (i=0; i<contractIdElements.length; i++) {
				if (contractIdElements[i].checked) {
					params.contractId = contractIdElements[i].value;
					break;
				}
			}
		}
		
		//For Handling multiple clicks
		if (!submitRequest()) {
			return;
		}   
		cursor_wait();	
		
		wc.service.invoke(ajaxShopCartService, params);
		if (typeof productDisplayJS != 'undefined') {
			productDisplayJS.baseItemAddedToCart = true;
		}
		
		if (dojo.byId("headerShopCartLink") && dojo.byId("headerShopCartLink").style.display != "none") {
			dojo.byId("headerShopCart").focus();
		} else if (dojo.byId("headerShopCart1")) {
			dojo.byId("headerShopCart1").focus();
		}
	},
	
	/**
	* addSkus2ShopCartAjax This function is used to add one or more SKUs to the shopping cart using an AJAX call.
	* @param {String} productId the product Id being added to cart 	
	* @param {Object} customParams - Any additional parameters that needs to be passed during service invocation.
	**/
	addSkus2ShopCartAjax : function(productId, customParams) {	
		if (browseOnly){
			MessageHelper.displayErrorMessage(storeNLS['ERROR_ADD2CART_BROWSE_ONLY']); 
			return;
		
		}
		var params = [];
		params.storeId = this.storeId;
		params.catalogId = this.catalogId;
		params.langId = this.langId;
		params.orderId = ".";
		// Remove calculations for performance
		// params.calculationUsage = "-1,-2,-5,-6,-7";
		params.inventoryValidation = "true";
		params.calculateOrder = "0";
		params.addedFromSKUList = "true";
		var ajaxShopCartService = "AddOrderItem";
		
		shoppingActionsJS.productAddedList = new Object();
		
		//Get all of the SKUs and their quantities and pass in as parameters (e.g. catEntryId_1, quantity_1)
		if (productId in this.quantityList) {
			var i = 1;
			for (var skuId in this.quantityList[productId]) {
				var quantity = this.quantityList[productId][skuId];
				if(!isPositiveInteger(quantity)){
					MessageHelper.displayErrorMessage(storeNLS['QUANTITY_INPUTS_ERROR']);
					return;
				}
				params["catEntryId_" + i] = skuId;
				params["quantity_" + i]	= quantity;
				i++;
				
				shoppingActionsJS.saveAddedProductInfo(quantity, productId, skuId, null, true);
			}
		}
		
		if (params.catEntryId_1 == null || params.quantity_1 == null) {
			MessageHelper.displayErrorMessage(storeNLS['QUANTITY_INPUTS_ERROR']);
			return;
		}
		
		//Pass any other customParams set by other add on features
		if (customParams != null && customParams != 'undefined'){
			for (i in customParams){
				params[i] = customParams[i];
			}
			if (customParams['catalogEntryType'] == 'dynamicKit' ){
				ajaxShopCartService = "AddPreConfigurationToCart";
			}
		}

		var contractIdElements = document.getElementsByName('contractSelectForm_contractId');
		if (contractIdElements != null && contractIdElements != "undefined") {
			for (i=0; i<contractIdElements.length; i++) {
				if (contractIdElements[i].checked) {
					params.contractId = contractIdElements[i].value;
					break;
				}
			}
		}
		
		//For Handling multiple clicks
		if (!submitRequest()) {
			return;
		}   
		cursor_wait();	
		
		wc.service.invoke(ajaxShopCartService, params);
		if (typeof productDisplayJS != 'undefined') {
			productDisplayJS.baseItemAddedToCart = true;
		}
		
		if (dojo.byId("headerShopCartLink") && dojo.byId("headerShopCartLink").style.display != "none") {
			dojo.byId("headerShopCart").focus();
		} else if (dojo.byId("headerShopCart1")) {
			dojo.byId("headerShopCart1").focus();
		}
	}
}

//Declare refresh controller
if (typeof wc.render.getRefreshControllerById("SKUListTable_Widget_Controller") == "undefined") {
	wc.render.declareRefreshController({
		id: "SKUListTable_Widget_Controller",
		url: "SKUListView",
		formId: ""
	
		,postRefreshHandler: function(widget) {
			SKUListJS.showTableView(widget);
			var productId = widget.id.substring("WC_Sku_List_Table_".length);
			SKUListJS.arrangeProductDetailTable(productId);
			SKUListJS.checkOnlineAvailability(productId);
			SKUListJS.populateStoreLinks();
			cursor_clear();
		}
	});
}