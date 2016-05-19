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
    var LOGO = plugin.path + "logo.png";
    var BACKGROUND = plugin.path + "views/img/background.jpg";
    
    var DEFAULT_URL = 'http://www.pornhub.com';
    var DEFAULT_CATEGORY_URL = 'http://www.pornhub.com/categories';
    var DEFAULT_SEARCH_URL = 'http://www.pornhub.com/video/search?search=';
    var MOVIE_PAGE_URL = 'http://www.pornhub.com/view_video.php?viewkey=';
    var MAX_MOVIES_PER_PAGE = 28;
    
    function setPageHeader(page, title, image) {
        if (page.metadata) {
            page.metadata.title = title;
            page.metadata.logo = LOGO;
            if (image) {
            	page.metadata.background = image;
            	page.metadata.backgroundAlpha = 0.3;
            } else {
            	page.metadata.background = BACKGROUND;
            	page.metadata.backgroundAlpha = 0.7;
            }
        }
    }
    
	var service = plugin.createService(plugin.getDescriptor().title, PREFIX + ":start", "video", true, LOGO);
	
    var settings = plugin.createSettings(plugin.getDescriptor().title, LOGO, plugin.getDescriptor().synopsis);

    settings.createMultiOpt('sorting', "Sort by", [
	        [0, 'Featured recently', true],
	        ['o=mv', 'Most Viewed'],
	        ['o=tr', 'Top Rated'],
	        ['o=ht', 'Hottest'],
	        ['o=lg', 'Longest'],
	        ['o=cm', 'Newest']
        ],
        function(v) {
            service.sorting = v;
    	}
    );
    
    settings.createMultiOpt('period', "Period (applicable only to Most Viewed and Top Rated):", [
		    ['t=t', 'Daily'],
	        [0, 'Weekly', true],
	        ['t=m', 'Monthly'],
	        ['t=a', 'All Time']
        ],
        function(v) {
            service.period = v;
       	}
    );
    
    settings.createString('from', 'Hottest from (input your country code like "us" or "pl" etc.):', 'pl',
    	function(v) {
            service.from = v;
        }
    );
    
	settings.createMultiOpt('quality', "Video quality (if not found - closest will be selected)", [
        ['letMeChoose', 'Let me choose', true],
        ['1080', '1080p'],
        ['720', '720p'],
        ['480', '480p'],
        ['360', '360p'],
        ['240', '240p']
        ], function(v) {
            service.quality = v;
    	}
    );

	function d(c) {
		print(JSON.stringify(c, null, 4));
	}
	
	function resolveUrl(pageNumber, specificUrl) {
		
		var url = DEFAULT_URL + '/video';
    	if (specificUrl) {
    		url = specificUrl;
    	}
    	
   		if (service.sorting != 0) {
   		
   			var delim = '?';
			if(url.indexOf('?') > -1) {
				delim = '&';
			}
			url += delim;
   		
   		
   			url += service.sorting;
   		
       		if (service.sorting == 'o=mv' || service.sorting == 'o=tr') {
       			if (service.period != 0) {
       				url += '&' + service.period;
       			}
       		} else if (service.sorting == 'o=ht') {
       			url += '&cc=' + service.from;
       		}
   		
   		}
   		
   		if (pageNumber != 1) {
   			if (url.charAt(url.length-1) != '?') {
   				url += '&';
   			}
   		    url += 'page=' + pageNumber;
   		}
   		
   		return url;
		
	}
	
    function browseItems(page, specificUrl) {
		var morePages = true;    	
        var pageNumber = 1;
        page.entries = 0;

        // 1 - viewkey; 2 - title; 3 - duration; 4 - img; 5 - views; 6 - votes; 7 - added
        var pattern = /<a href="\/view_video\.php\?viewkey=([a-z0-9]*?)" title="([\s\S]*?)"[\s\S]*?"duration">([\s\S]*?)<\/[\s\S]*?data-mediumthumb="([\s\S]*?)"[\s\S]*?<[\s\S]*?"views"><var>([\s\S]*?)<\/var>[\s\S]*?rating-container[\s\S]*?(\d+)%[\s\S]*?<[\s\S]*?"added">([\s\S]*?)<\/[\s\S]*?>/igm;
        
        var pagePattern = /"page_next"[\s\S]+?\/video[\s\S]*?page=(\d*)/igm;
        
        function loader() {
        	
        	//for the purpose of search - loader in search and in showing search values are different instances (!?)
        	//therefore we have to check this flag as well
        	if (url != null && !morePages) {
        		return false;
        	}
        	
        	page.loading = true;
        	
        	var url = resolveUrl(pageNumber, specificUrl);

        	d(url);
	        var c = showtime.httpReq(url);
	        
	        while ((match = pattern.exec(c)) !== null) {
	        	
	        	//d(match);
	
				page.appendItem(PREFIX + ":movie:" + match[1], 'video', {
							title : new showtime.RichText(match[2]),
							icon : new showtime.RichText(match[4]),
							duration : match[3],
							playcount : match[5],
							rating: match[6]*1,
							timestamp: match[7],
							description : new showtime.RichText(match[2])
						});
				page.entries++; // for searcher to work
	
			}
			
			page.loading = false;
			if (pageNumber == 1 && page.metadata) {	//only for first page - search results
               page.metadata.title += ' (' + page.entries;
               if (page.entries == MAX_MOVIES_PER_PAGE) {
	               page.metadata.title += '+';
               }
               page.metadata.title += ')';
            }
			
			pageNumber++;
			
			
			
			//TODO pagination!
			/*match = pagePattern.exec(c);
			d(match);
			if (match == null) {	//TODO no idea why it just cannot use pagePattern...
				var t = /href="\/video\?page=\d*">\d*<\/a><\/li>([\s\S]+?)<\/ul>/img;
				var m = t.exec(c);
				match = pagePattern.exec(m[1]);
				d(match);
			};
			morePages = (match != null);
			return match != null;*/
			
			
			return true;
        }
		
        //for search to work
        loader();
        page.paginator = loader;
        
    }

    plugin.addURI(PREFIX + ":start", function(page) {
        setPageHeader(page, plugin.getDescriptor().synopsis);
        page.type = "directory";
        page.contents = "movies";
        
        page.appendItem(PREFIX + ":categories", "directory", {
            title: 'Categories'
        });
        page.appendItem("", "separator", {
            title: 'Newest'
        });
        browseItems(page);
    });
    
    plugin.addURI(PREFIX + ":categories", function(page, c) {
    	setPageHeader(page, "Categories");
    	page.type = "directory";
        page.contents = "movies";
    	
    	page.loading = true;
    	// 1 - categoryId; 2 - title
    	var pattern = /<a class="sidebarIndent" href="(.+?)">([\S\s]*?)</igm;
    	var c = showtime.httpReq(DEFAULT_CATEGORY_URL);
    	while ((match = pattern.exec(c)) !== null) {
    		//d(match);
            page.appendItem(PREFIX + ":categories:" + match[1], "directory", {
                title: match[2]
            });
    	}
    	page.loading = false;
    	
    });
    
    plugin.addURI(PREFIX + ":categories:(.*)", function(page, c) {
    	setPageHeader(page, "Category listing");
    	page.type = "directory";
        page.contents = "movies";

        page.appendItem(PREFIX + ":categories:" + c + ":professional", "directory", {
            title: 'Professional'
        });
        page.appendItem(PREFIX + ":categories:" + c + ":homemade", "directory", {
            title: 'Homemade'
        });
        page.appendItem("", "separator", {
            title: 'All'
        });
   		browseItems(page, DEFAULT_URL + c);
    	
    });

    plugin.addURI(PREFIX + ":categories:(.*):(.*)", function(page, c, p) {
    	setPageHeader(page, "Category listing, "+p);
    	page.type = "directory";
        page.contents = "movies";

		var delim = '?';
		if(c.indexOf('?') > -1) {
			delim = '&';
		}

   		browseItems(page, DEFAULT_URL + c + delim + 'p=' + p);
    	
    });
    
    plugin.addURI(PREFIX + ":movie:(.*)", function(page, id) {
    	page.loading = true;
    	setPageHeader(page, "Searching...");
        
        d(MOVIE_PAGE_URL + id);
        var c = showtime.httpReq(MOVIE_PAGE_URL + id);
        
        var flashvars;

        if (service.quality == 'letMeChoose') {
            page.type = "directory";
            page.contents = "movies";
        }
        
	    // 1 - type, 2 - description, 3 - title, 4 - imageurl, 5 - duration, 6 - negative-rating
	    var pattern = /var flashvars.*? = (\{[\s\S]+?\});/igm;
	    if ((match = pattern.exec(c)) !== null) {
	        	
            flashvars = JSON.parse(match[1]);
            //d(flashvars);
	        	
            setPageHeader(page, flashvars.video_title, flashvars.image_url);
	    }
	        
        if (service.quality == 'letMeChoose') {
            page.appendItem("", "separator", {
                  	title: "Quality"
            });
        }
        

        
        // 1 - quality, 2 - link
        var pattern = /var player_quality_([\s\S]*?)p = '([\s\S]*?)';/igm;
        var addedQuality = false;
        var bestMatch;
        var metadata = {};
        metadata.title = flashvars.video_title;
        metadata.canonicalUrl = PREFIX + ":movie:" + id;
        metadata.no_fs_scan = true;
        
        while ((match = pattern.exec(c)) !== null) {
        	//d(match);
            addedQuality = true;
            
            if (service.quality == 'letMeChoose') {
                
                metadata.sources = [{ url: match[2], bitrate: match[1] }];
                //d(metadata);
                
                page.appendItem("videoparams:"+showtime.JSONEncode(metadata), 'video', {
                            title : new showtime.RichText(match[1]),
                            icon : flashvars.image_url,
                            duration: flashvars.video_duration,
                            description : new showtime.RichText(flashvars.video_title)
                        });
                
            } else {
                
            	var desiredQuality = parseInt(service.quality);
                var quality = parseInt(match[1]);
            	
            	if (desiredQuality == quality) {	//find desired quality
                    metadata.sources = [{ url: match[2], bitrate: match[1] }];
                    //d(metadata);
                    page.loading = false;
                    page.source = "videoparams:"+showtime.JSONEncode(metadata);
                    page.type = "video";
            	}
            	
            	// init
            	if (bestMatch == null) {
            		bestMatch = match;
            		continue;
            	}
            	
	        	//find closest quality from bottom (bottom first)
		        if (quality > bestMatch[1] && quality < desiredQuality) {
					bestMatch = match;
					//d(bestMatch);
					continue;
				}
				
		        //find closest quality from top
		        if (quality < bestMatch[1] && quality > desiredQuality) {
					bestMatch = match;
					//d(bestMatch);
					continue;
				}
                
            }
        }
        
        page.loading = false;
        
        
        if (service.quality != 'letMeChoose') {
        	
        	d(bestMatch);
        	
   	        //if there are no quality versions, show a default one
	        if (!addedQuality) {
				page.error("Selected video has no quality versions...");
				return;
	        } else {
	        	if (bestMatch == null) {
			       	page.error("Selected video is not available on this platform.");
					return;
			    } else {
                    
                    metadata.sources = [{ url: bestMatch[2], bitrate: bestMatch[1] }];
                    //d(metadata);
                    
                    page.loading = false;
                    page.source = "videoparams:"+showtime.JSONEncode(metadata);
                    page.type = "video";
                    
			    }
	        }
        } else {
	        if (!addedQuality) {
				page.error("Selected video has no quality versions...");
				return;
	        }
        }
        
        
    });
    
	plugin.addSearcher(plugin.getDescriptor().id, LOGO, function(page, search) {
        browseItems(page, DEFAULT_SEARCH_URL + search.replace(" ", "+"));
    });

})(this);
