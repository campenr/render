type Matrix3 = [
    number, number, number,
    number, number, number,
    number, number, number,
]

export const m3 = {
  translation: function translation(tx: number, ty: number) : Matrix3 {
    return [
      1, 0, 0,
      0, 1, 0,
      tx, ty, 1
    ];
  },

  rotation: function rotation(angleInRadians: number) : Matrix3 {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);
    return [
      c,-s, 0,
      s, c, 0,
      0, 0, 1
    ];
  },

  scaling: function scaling(sx: number, sy: number) : Matrix3 {
    return [
      sx, 0, 0,
      0, sy, 0,
      0, 0, 1
    ];
  },
};
