#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define CPPFILT "c++filt"

int cppfilt(const char* const symbol, char* output, size_t output_size) {
    size_t sym_len = strlen(symbol);
    char command[sym_len + sizeof(CPPFILT)];
    strcpy(command, CPPFILT " ");
    strcpy(command + strlen(CPPFILT) + 1, symbol);
    FILE* fp = popen(command, "r");
    if (fp == NULL) {
        return 0;
    }
    char* ret = fgets(output, output_size, fp);
    if (ret == NULL) {
        return 0;
    }
    *strchrnul(output, '\n') = '\0';
    pclose(fp);
    return 1;
}
