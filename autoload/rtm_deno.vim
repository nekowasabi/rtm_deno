" RTM Deno autoload functions

function! rtm_deno#check_status() abort
  echo 'Denops server status: ' . denops#server#status()
  echo 'Denops plugin#register exists: ' . exists('*denops#plugin#register')
  
  " List denops plugins
  if exists('*denops#plugin#list')
    echo 'Loaded denops plugins: ' . string(denops#plugin#list())
  endif
endfunction