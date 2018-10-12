#include <stdio.h>
#include <string.h>
#include "cn_slow_hash.hpp"

inline unsigned char hf_hex2bin(char c, bool& err)
{
	if (c >= '0' && c <= '9')
		return c - '0';
	else if (c >= 'a' && c <= 'f')
		return c - 'a' + 0xA;
	else if (c >= 'A' && c <= 'F')
		return c - 'A' + 0xA;

	err = true;
	return 0;
}

bool hex2bin(const char* in, unsigned int len, unsigned char* out)
{
	bool error = false;
	for (unsigned int i = 0; i < len; i += 2)
	{
		out[i / 2] = (hf_hex2bin(in[i], error) << 4) | hf_hex2bin(in[i + 1], error);
		if (error) return false;
	}
	return true;
}

inline char hf_bin2hex(unsigned char c)
{
	if (c <= 0x9)
		return '0' + c;
	else
		return 'a' - 0xA + c;
}

void bin2hex(const unsigned char* in, unsigned int len, char* out)
{
	for (unsigned int i = 0; i < len; i++)
	{
		out[i * 2] = hf_bin2hex((in[i] & 0xF0) >> 4);
		out[i * 2 + 1] = hf_bin2hex(in[i] & 0x0F);
	}
}

thread_local cn_pow_hash_v2 hashobj;
thread_local char return_buf[65] = {0};

// hash = Module.cwrap('hash_cn', 'string', ['string', 'string', 'number'])
// test vector : {"jsonrpc":"2.0","method":"job","params":{"blob":"0303f6d6ccd7056647ae7cd18be02c22cdcc36c0d97b2c741ed7d0d089c1129270cfbeefc8da420000000030a80070b84b85a3a20d24db230c5bebbee94f74bd7e06265df29ac99059c3aa0c","job_id":"307184322644025","target":"9bc42000"}}
// correct hash : {"method":"submit","params":{"id":"977479694923386","job_id":"307184322644025","nonce":"8a130000","result":"7c9c6300f80ba5bda8b6d63438a0793fe78c1025dc85849b00f53d9595a81500"},"id":1}
//
// val = hash("0303f6d6ccd7056647ae7cd18be02c22cdcc36c0d97b2c741ed7d0d089c1129270cfbeefc8da420000000030a80070b84b85a3a20d24db230c5bebbee94f74bd7e06265df29ac99059c3aa0c", "9bc42000", 5002)
// val == "7c9c6300f80ba5bda8b6d63438a0793fe78c1025dc85849b00f53d9595a81500"

// Example usage:
// function num2hex(num) {
//    str = num.toString(16);
//    str = "0".repeat(8 - str.length) + str;
//    return str.charAt(6)+str.charAt(7)+str.charAt(4)+str.charAt(5)+str.charAt(2)+str.charAt(3)+str.charAt(1)+str.charAt(0);
// }
// num2hex(5002) == "8a130000"
//
// var nonce = 0;
// var res = "";
// while((res = hash(blob_from_pool, target_from_pool, nonce)) == "") nonce++;
// if(res == "ERROR") handle_error;
// send_to_pool(num2hex(nonce), res);

extern "C" const char* hash_cn(const char* blob, const char* target, uint32_t nonce)
{
	uint8_t b_blob[128];
	uint32_t bloblen;
	uint32_t out[8];
	uint32_t i_target;
	uint32_t* piNonce = (uint32_t*)(b_blob + 39);

	if(strlen(target) != 8)
		return "ERROR";

	if(!hex2bin(target, 8, (unsigned char*)&i_target))
		return "ERROR";

	bloblen = strlen(blob);
	if(bloblen >= 256 || bloblen % 2 != 0)
		return "ERROR";

	if(!hex2bin(blob, bloblen, b_blob))
		return "ERROR";
	bloblen /= 2;
	
	*piNonce = nonce;
	hashobj.hash(b_blob, bloblen, out);

	if(out[7] < i_target)
	{
		bin2hex((unsigned char*)out, 32, return_buf);
		return return_buf;
	}
	else
	{
		return "";
	}
}


