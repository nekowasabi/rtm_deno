# rtm_deno

Manipulating Remember the milk from vim plugin.

## requirements
[denops](https://github.com/vim-denops/denops.vim)

## install
```
Plug 'vim-denops/denops.vim'
Plug 'nekowasabi/rtm_deno'
```

## usage
### authorize
Get RTM's token by `:RtmAuth` command.

### add single task
Use `:RtmAddTask` command.

### add multiple tasks
Select text by visual mode.
And execute `:RtmAddSelectedTask` command.
