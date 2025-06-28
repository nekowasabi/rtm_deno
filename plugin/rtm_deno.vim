" RTM Deno Plugin
" Vim plugin for Remember The Milk using Denops

if exists('g:loaded_rtm_deno')
  finish
endif
let g:loaded_rtm_deno = 1

" Debug commands (optional)
command! RtmCheckStatus call rtm_deno#check_status()