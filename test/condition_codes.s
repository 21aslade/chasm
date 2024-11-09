    mov r3, 0
    mov r0, 0x11
    mov r1, 0x11
    cmp r0, r1
    beq next_00
    call fail
next_00:

    mov r0, 0x11
    mov r1, 0x10
    cmp r0, r1
    bne next_01
    call fail
next_01:

    mov r0, 0x12
    mov r1, 0x11
    cmp r0, r1
    bgt next_02
    call fail
next_02:

    mov r0, 0x10
    mov r1, 0x11
    cmp r0, r1
    ble next_03
    call fail
next_03:

    mov r0, 0x55
    mov r1, 0x11
    cmp r0, r1
    bhi next_04
    call fail
next_04:

    mov r0, 0x10
    mov r1, 0x12
    cmp r0, r1
    blo next_05
    call fail
next_05:

    mov r0, 0x10
    mov r1, 0x10
    cmp r0, r1
    bhs next_06
    call fail
next_06:

    mov r0, 0x11
    mov r1, 0x12
    cmp r0, r1
    bls next_07
    call fail
next_07:

    mov r0, 0x01
    mov r1, 0x00
    cmp r0, r1
    bpl next_08
    call fail
next_08:

    mov r0, 0xFF
    mov r1, 0x00
    cmp r0, r1
    bmi next_09
    call fail
next_09:

    mov r0, 0x01
    mov r1, 0x01
    cmp r0, r1
    bvc next_10
    call fail
next_10:

    mov r0, 0x7F
    mov r1, 0xFF
    cmp r0, r1
    bvs next_11
    call fail
next_11:

    mov r0, 0x55
    mov r1, 0x55
    cmp r0, r1
    bal next_12
    call fail
next_12:
    hlt

fail:
    add r7, 1
    ret
