/**
 *  pornhub plugin for Movian
 *
 *  Copyright (C) 2015 Pisek
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program. If not, see <http://www.gnu.org/licenses/>.
 *  
 */


(function(plugin) {
    var PREFIX = 'pornhub';
    var logo = plugin.path + "logo.png";
    
    var DEFAULT_URL = 'http://www.cda.pl/video/';
    
    function setPageHeader(page, title) {
        if (page.metadata) {
            page.metadata.title = title;
            page.metadata.logo = logo;
        }
    }
    
	var service = plugin.createService(plugin.getDescriptor().id, PREFIX + ":start", "video", true, logo);

	function d(c) {
		print(JSON.stringify(c, null, 4));
	}
	
    function browseItems(page, search) {
		var moreSearchPages = true;    	
        var pageNumber = 1;
        page.entries = 0;

        //1 - desc, 2 - id, 3 - img, 4 - name
        var patternVideo = /<label  title="([\s\S]*?)">\s*<div class="videoElem">\s*<a class="aBoxVideoElement" .* href="\/video\/(\d\w+)".*>\s*<img.*src="(.*?)".*>[\s\S]*?<a.*alt="(.*?)">/igm;
        
        //1 - desc, 2 - id, 3 - img, 4 - name
        var patternSearch = /<label  title="([\s\S]*?)">[\s\S]*?<a.*href="\/video\/(\d\w+)".*>[\s\S]*?<img.*src="(.*?)".*\s*alt="(.*?)">/igm;
        
        var pattern;
        if (search == null) {
        	pattern = patternVideo;
        } else {
        	pattern = patternSearch;
        }
        
        var pagePattern = /<span class="disabledPage">(\d+)<\/span> <span class="disabled">&gt;<\/span>/igm;
        
        function loader() {
        	
        	//for the purpose of search - loader in search and in showing search values are different instances (!?)
        	//therefore we have to check this flag as well
        	if (search != null && !moreSearchPages) {
        		return false;
        	}
        	
        	page.loading = true;
        
        	var url;
        	if (search == null) {
        		url = DEFAULT_URL + 'p' + pageNumber;
        	} else {
        		url = DEFAULT_URL + 'show/' + search.replace(/\s/g, '_') + '/p' + pageNumber;
        	}
        	
        	d(url);
	        var c = showtime.httpReq(url);
	        
	        while ((match = pattern.exec(c)) !== null) {
	
				page.appendItem(PREFIX + ":movie:" + match[2], 'video', {
							title : new showtime.RichText(match[4]),
							icon : new showtime.RichText(match[3]),
							description : new showtime.RichText(match[1])
						});
				page.entries++; // for searcher to work
	
			}
			
			page.loading = false;
			if (pageNumber == 1 && page.metadata) {	//only for first page - search results
               page.metadata.title += ' (' + page.entries;
               if (page.entries == 24) {
	               page.metadata.title += '+';
               }
               page.metadata.title += ')';
            }
			
			pageNumber++;
			match = pagePattern.exec(c);
			d(match);
			moreSearchPages = (match == null);
			return match == null;
        }
		
        //for search to work
        loader();
        page.paginator = loader;
        
    }

    plugin.addURI(PREFIX + ":start", function(page) {
        setPageHeader(page, plugin.getDescriptor().synopsis);
        page.type = "directory";
        page.contents = "items";
        
        page.appendItem("", "separator", {
            title: 'Newest'
        });
        browseItems(page);
    });
    
    plugin.addURI(PREFIX + ":movie:(.*)", function(page, id) {
    	page.loading = true;
    	page.type = "directory";
        page.contents = "items";
        
        d(DEFAULT_URL + id);
        var c = showtime.httpReq(DEFAULT_URL + id);
        
        // 1 - type, 2 - description, 3 - title, 4 - imageurl, 5 - duration, 6 - negative-rating
        var pattern = /<meta property="og:type" content="(.*?)".*>[\s\S]*<meta property="og:description" content="([\s\S]+?)".*>\s*<meta property="og:title" content="(.+?)".*>\s*<meta property="og:image" content="(.+?)".*>[\s\S]*config: \{\s*duration: "([\d:]+)",[\s\S]*<span class="bialeSred"><span class="szareSred" style="width:(\d*?)px"><\/span><\/span>/igm;
        if ((match = pattern.exec(c)) !== null) {
        	d(match[1]);
        	d(match[2]);
        	d(match[3]);
        	d(match[4]);
        	d(match[5]);
        	d(match[6]);
        	var type = match[1];
        	var desc = match[2];
        	var title = match[3];
        	var image = match[4];
        	var duration = match[5];
        	var rating = (80-match[6])/80*100;
        	
        	page.metadata.title = title;
        	page.metadata.background = image;
        	page.metadata.backgroundAlpha = 0.3;
        }
        
        page.appendItem("", "separator", {
            	title: "Quality"
        });
        
        // 1 - link url, 2 - quality
        var pattern = /<a.*?href="\/video\/(\d\w+\?wersja=(\d\w+))".*?>/igm;
        var addedQuality = false;
        while ((match = pattern.exec(c)) !== null) {
        	d(match);
        	page.appendItem(PREFIX + ":video:" + match[1], 'video', {
						title : new showtime.RichText(match[2]),
						icon : image,
						genre: type,
						rating: rating,
						duration: duration,
						description : new showtime.RichText(desc)
					});
			addedQuality = true;
        }
        
        //if there are no quality versions, add a default one
        if (!addedQuality) {
        	page.appendItem(PREFIX + ":video:" + id, 'video', {
						title : new showtime.RichText("Default quality"),
						icon : image,
						genre: type,
						rating: rating,
						duration: duration,
						description : new showtime.RichText(desc)
					});
        }
        
        page.loading = false;
    });
    
    plugin.addURI(PREFIX + ":video:(.*)", function(page, id) {
    	page.loading = true;

        var c = showtime.httpReq(DEFAULT_URL + id);
        d(c.headers);
        
        var pattern = /if \(checkFlash\(\)\)\{\s*l='(.*)';\s*jwplayer/igm;
        if ((match = pattern.exec(c)) !== null) {
        	/*c = showtime.httpReq(match[1]);
        	d(c.headers);*/
        	d(match[1]);
        	page.source = match[1];
        } else {
        	//youtube movie (or other)
        	d('cannot open movie other than cda');
			page.redirect(PREFIX + ":start");        	
        }
        page.loading = false;
        page.type = "video";
    });
    
	plugin.addSearcher(plugin.getDescriptor().id, logo, function(page, search) {
        browseItems(page, search);
    });

})(this);
