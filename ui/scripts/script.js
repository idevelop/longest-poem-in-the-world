function fetch_verses(addr, id) {
	var req = new Request({  
		method: 'get',  
		url: addr+"more/?id="+id,
		data: {'ignoreMe':new Date().getTime()},
		onComplete: function(response) {
			if (response==".") location.href=addr; else {
				$('verses').innerHTML=response;
			}
		}
	}).send();
	
	return false;
}