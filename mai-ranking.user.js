// ==UserScript==
// @name         Mai Rating
// @namespace    https://7ddn.github.io/
// @version      0.1
// @description  Generate B50 Picture for maimai dx
// @author       七度
// @match        https://maimaidx.jp/maimai-mobile/home/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @require      https://code.jquery.com/jquery-3.6.3.js
// @require      https://7ddn.github.io/Lv.js
// @updateURL    https://github.com/7ddn/MaimaiB50Gen/releases/download/v0.1.0/mai-ranking.user.js
// @downloadURL  https://github.com/7ddn/MaimaiB50Gen/releases/download/v0.1.0/mai-ranking.user.js
// @grant        none
// ==/UserScript==

(function () {
    const kindMap = { 'dx': 'DX', 'standard': 'STD' };
    const diffMap = { '0': 'BASIC', '1': 'HARD', '2': 'EXP', '3': 'MAS', '4': 'ReMAS' };
    const diffName = ['basic', 'advance', 'expert', 'master', 'remaster'];

    let Song = class {
        constructor(name, diff, score, kind, lv, innerLv, version) {
            this.name = name;
            this.diff = diff;
            this.score = score == '' ? 0.0 : parseFloat(score);
            this.kind = kind;
            this.lv = lv;
            this.innerLv = innerLv;
            this.version = version;
            this.rating = Math.round(this.calcRating() / 100);
        }

        calcRating() {
            let coef;
            if (this.score >= 100.5) coef = 22.4; else
                if (this.score >= 100.0) coef = 21.6; else
                    if (this.score >= 99.5) coef = 21.1; else
                        if (this.score >= 99) coef = 20.8; else
                            if (this.score >= 98) coef = 20.3; else
                                if (this.score >= 97) coef = 20.0; else
                                    if (this.score >= 94) coef = 16.8; else
                                        if (this.score >= 90) coef = 15.2; else
                                            if (this.score >= 80) coef = 13.6; else
                                                if (this.score >= 75) coef = 12.0; else
                                                    if (this.score >= 70) coef = 11.2; else
                                                        if (this.score >= 60) coef = 9.6; else
                                                            if (this.score >= 50) coef = 8.0; else
                                                                coef = 0.0;
            return ((this.score > 100.5) ? 100.5 : this.score) * coef * this.innerLv;
        }
    }

    let innerLvs = new Map();
    let versions = new Map();

    // Parse Inner LV
    lvData.forEach(function (music) {
        innerLvs.set(music.Name + music.Kind + music.Diff, parseFloat(music.Lv))
        versions.set(music.Name + music.Kind + music.Diff, music.Ver)
    })
    //console.log(innerLvs);

    // Patterns
    const musicKindPattern = /https:\/\/maimaidx.jp\/maimai-mobile\/img\/music_(standard|dx)\.png/;

    // PlayerName
    let playerName = $("div.name_block.f_l.f_16").text();

    // Add Button
    $("div.comment_block.break.f_l.f_12").append(
        $("<button></button>").text("Generate Best 50 Image")
            .click(function () {
                drawB50(getB50Score(), playerName);
            })
            .addClass(['p_3', 't_l', 'f_13', 'underline', 'break'])
    )

    // Get Score
    function getB50Score() {
        const scoreUrl = "https://maimaidx.jp/maimai-mobile/record/musicGenre/search/?genre=99&diff="
        let songs = new Array();
        [0, 1, 2, 3, 4].forEach(diff => {
            $.ajax({
                url: scoreUrl + diff,
                type: "get",
                async: false,
                success: data => {
                    $(data).find("div.music_" + diffName[diff] + "_score_back.pointer.p_3").children("form").each(function () {
                        let name = $(this).find("div.music_name_block.t_l.f_13.break").text();
                        let score = $(this).find("div.music_score_block.w_120.t_r.f_l.f_12").text().replace('%', '');
                        let kindSrc = $(this).parent().siblings("img").last().attr("src");
                        let kind = kindSrc.match(musicKindPattern)[1];
                        let lv = $(this).find("div.music_lv_block.f_r.t_c.f_14").text();
                        let key = name + kindMap[kind] + diffMap[diff];
                        let innerLv;
                        let version;
                        if (!innerLvs.has(key)) {
                            key = name + kindMap[kind] + diffMap[4];
                            if (innerLvs.has(key)) {
                                version = versions.get(key);
                            } else version = 0;
                            if (lv.includes('+')) {
                                innerLv = parseFloat(lv.replace('+', '')) + 0.7
                            } else innerLv = parseFloat(lv);
                        } else {
                            innerLv = innerLvs.get(key);
                            version = versions.get(key);
                        }
                        songs.push(new Song(name, diff, score, kind, lv, innerLv, version))
                    })
                }
            })
        });

        songs.sort((a, b) => {
            if (a.version < b.version) return -1;
            if (a.rating > b.rating) return -1;
            if (a.rating < b.rating) return 1;
            if (a.innerLv > b.innerLv) return -1;
            if (a.innerLv == b.innerLv) return 0;
            return 1;
        });
        let B35 = songs.slice(0, 35);

        songs.sort((a, b) => {
            if (a.version > b.version) return -1;
            if (a.rating > b.rating) return -1;
            if (a.rating < b.rating) return 1;
            if (a.innerLv > b.innerLv) return -1;
            if (a.innerLv == b.innerLv) return 0;
            return 1;
        });
        let B15 = songs.slice(0, 15);

        return [B35, B15];
    }

    function drawB50([B35, B15], playerName) {
        // create canvas
        console.info('drawing B50 for ' + playerName)
        
        $("div.comment_block.break.f_l.f_12").append(
            $("<canvas id='b50Container' hidden></canvas>")
            // don't hidden during test
        )
        
        //document.write("<canvas id='b50Container'></canvas>");

        let canvas = document.getElementById('b50Container');
        let ctx = canvas.getContext('2d');

        canvas.width = 1528;
        canvas.height = 1000;

        let imgURL = [
            'https://7ddn.github.io/assets/bg.png', //bg
            'https://7ddn.github.io/assets/back_music_basic.png',
            'https://7ddn.github.io/assets/back_music_advanced.png',
            'https://7ddn.github.io/assets/back_music_expert.png',
            'https://7ddn.github.io/assets/back_music_master.png',
            'https://7ddn.github.io/assets/back_music_remaster.png',
            'https://7ddn.github.io/assets/back_music_level.png',
            'https://7ddn.github.io/assets/chara.png',
            'https://7ddn.github.io/assets/logo.png',
            'https://7ddn.github.io/assets/music_dx.png',
            'https://7ddn.github.io/assets/music_standard.png',
            'https://7ddn.github.io/assets/rating_base_green.png',
            'https://7ddn.github.io/assets/rating_base_red.png',
            'https://7ddn.github.io/assets/rating_base_purple.png',
            'https://7ddn.github.io/assets/rating_base_bronze.png',
            'https://7ddn.github.io/assets/rating_base_silver.png',
            'https://7ddn.github.io/assets/rating_base_gold.png',
            'https://7ddn.github.io/assets/rating_base_platinum.png',
            'https://7ddn.github.io/assets/rating_base_rainbow.png',
        ]

        let imgPromise = new Array();
        imgURL.forEach((url) => {
            imgPromise.push(new Promise((resolve) => {
                let img = new Image();
                img.onload = () => resolve(img);
                img.src = url;
                img.crossOrigin = 'anonymous';
            }))
        })

        Promise.all(imgPromise).then((imgs) => {

            let rating35 = 0; //calculate rating;
            let rating15 = 0;

            ctx.drawImage(imgs[0], 0, 0, 1528, 1000); // draw bg

            ctx.drawImage(imgs[8], 100, 100, 329.39, 150); // draw logo

            ctx.drawImage(imgs[7], 878, 100, 527.73, 500); // draw chara

            // diff colors

            const shadowColor = ['#025235', '#c7450c', '#c02138', '#67148d', '#8c2cd5'];
            const innerColor = ['#6fe163', '#f8df3a', '#ff828e', '#c27ff4', '#e5ddea'];

            // block position and size

            let b35StartX = 139;
            let b35StartY = 300;

            let blockW = 115;
            let blockH = 115;

            let blockMarginX = 10;
            let blockMarginY = 10;

            let b15StartX = b35StartX + 7 * (blockW + blockMarginX) + blockMarginX;
            let b15StartY = b35StartY;

            let namePosDy = 95; // x is center
            let statusPosDy = 107;

            let nameFont = "10px メイリオ";
            let statusFont = "8px メイリオ";

            let textColor = "white";

            let kindSymbolDx = 55;
            let kindSymbolDy = -7;

            // draw B35



            B35.forEach((song, index) => {

                // for b35, there are 7 rows and 5 columns.
                let diff = parseInt(song.diff);

                let xIndex = Math.floor(index % 7);
                let yIndex = Math.floor(index / 7);

                let startX = b35StartX + xIndex * (blockW + blockMarginX);
                let startY = b35StartY + yIndex * (blockH + blockMarginY);

                // draw back outer and innerroundRect
                ctx.beginPath();
                ctx.roundRect(startX, startY, blockW, blockH, 5);
                ctx.fillStyle = shadowColor[diff];
                ctx.fill();

                ctx.beginPath();
                ctx.roundRect(startX + 2, startY + 2, blockW - 4, blockH - 4, 5);
                ctx.stroke();
                ctx.fillStyle = innerColor[diff];
                ctx.fill();

                // draw dx/std symbol, diff symbol, fc etc. symbol
                let kindImg;
                if (song.kind == 'dx') kindImg = imgs[9]; else kindImg = imgs[10];

                ctx.drawImage(kindImg, startX + kindSymbolDx, startY + kindSymbolDy, 56, 16); // kind

                // draw name and score

                ctx.beginPath();
                ctx.roundRect(startX + 7, startY + namePosDy - 10, blockW - 15, 23, 5);
                ctx.fillStyle = '#6A5ACD'
                ctx.fill();
                ctx.stroke();

                ctx.beginPath();
                ctx.roundRect(startX + 7, startY + namePosDy + 5, blockW - 15, 8, [0, 0, 5, 5]);
                ctx.fillStyle = '#483D8B'
                ctx.fill();
                ctx.stroke();

                ctx.beginPath();
                ctx.font = nameFont;
                ctx.textAlign = 'center'
                ctx.fillStyle = textColor;
                ctx.fillText(fittingString(ctx, song.name, 90), (startX * 2 + blockW) / 2, startY + namePosDy);

                ctx.beginPath();
                ctx.font = statusFont;
                ctx.fillText('Lv:' + song.innerLv + '/' + song.score + '%/Ra:' + song.rating, (startX * 2 + blockW) / 2, startY + statusPosDy, 90)

                rating35 += parseInt(song.rating);
            })

            B15.forEach((song, index) => {

                // for b15, there are 3 rows and 5 columns.
                let diff = parseInt(song.diff);

                let xIndex = Math.floor(index % 3);
                let yIndex = Math.floor(index / 3);

                let startX = b15StartX + xIndex * (blockW + blockMarginX);
                let startY = b15StartY + yIndex * (blockH + blockMarginY);

                // draw back outer and innerroundRect
                ctx.beginPath();
                ctx.roundRect(startX, startY, blockW, blockH, 5);
                ctx.fillStyle = shadowColor[diff];
                ctx.fill();

                ctx.beginPath();
                ctx.roundRect(startX + 2, startY + 2, blockW - 4, blockH - 4, 5);
                ctx.stroke();
                ctx.fillStyle = innerColor[diff];
                ctx.fill();

                // draw dx/std symbol, diff symbol, fc etc. symbol
                let kindImg;
                if (song.kind == 'dx') kindImg = imgs[9]; else kindImg = imgs[10];

                ctx.drawImage(kindImg, startX + kindSymbolDx, startY + kindSymbolDy, 56, 16); // kind

                // draw name and score

                ctx.beginPath();
                ctx.roundRect(startX + 7, startY + namePosDy - 8, blockW - 15, 21, 5);
                ctx.fillStyle = '#6A5ACD'
                ctx.fill();

                ctx.beginPath();
                ctx.roundRect(startX + 7, startY + namePosDy + 5, blockW - 15, 8, [0, 0, 5, 5]);
                ctx.fillStyle = '#483D8B'
                ctx.fill();
                ctx.stroke();

                ctx.beginPath();
                ctx.font = nameFont;
                ctx.textAlign = 'center'
                ctx.fillStyle = textColor;
                ctx.fillText(fittingString(ctx, song.name, 80), (startX * 2 + blockW) / 2, startY + namePosDy);

                ctx.beginPath();
                ctx.font = statusFont;
                ctx.fillText('Lv:' + song.innerLv + '/' + song.score + '%/Ra:' + song.rating, (startX * 2 + blockW) / 2, startY + statusPosDy, 80)

                rating15 += parseInt(song.rating);
            })

            let rating = rating35 + rating15;
            let ratingImg;

            if (rating < 7000) ratingImg = imgs[11]; else
                if (rating < 10000) ratingImg = imgs[12]; else 
                    if (rating < 12000) ratingImg = imgs[13]; else
                        if (rating < 13000) ratingImg = imgs[14]; else
                            if (rating < 14000) ratingImg = imgs[15]; else
                                if (rating < 14500) ratingImg = imgs[16]; else
                                    if (rating < 15000) ratingImg = imgs[17]; else
                                        ratingImg = imgs[18];


            // Draw Rating
            // This part need to be modified to soft
            ctx.drawImage(ratingImg, 450, 130, 172, 50);
            ctx.font = '25px メイリオ'
            ctx.textAlign = 'left'
            let ratingStartX = 532;
            let ratingStartY = 164;
            ctx.beginPath();
            ctx.fillText(rating, ratingStartX, ratingStartY);

            // Name
            ctx.beginPath();
            ctx.roundRect(452, 180, 200, 30, 5);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.stroke();
            ctx.font = '20px メイリオ'
            ctx.fillStyle = 'black';
            ctx.textAlign = 'left';
            ctx.fillText(playerName, 457, 205, 200);
            
            // Rating seperately
            ctx.beginPath();
            ctx.roundRect(452, 220, 200, 20, 10);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.stroke();
            ctx.font = '10px メイリオ'
            ctx.fillStyle = 'black'
            ctx.textAlign = 'center'
            ctx.fillText('ベスト: ' + rating35 + '    新曲: ' + rating15, 552, 235, 200);


            
            let eleLink = document.createElement('a');
            eleLink.download = 'B50.png';
            eleLink.style.display = 'none';
            eleLink.href = canvas.toDataURL('image/png');
            eleLink.click();
            

        })


    }

    // overflow text with ellipsis

    function fittingString(c, str, maxWidth) {
        var width = c.measureText(str).width;
        var ellipsis = '…';
        var ellipsisWidth = c.measureText(ellipsis).width;
        if (width <= maxWidth || width <= ellipsisWidth) {
            return str;
        } else {
            var len = str.length;
            while (width >= maxWidth - ellipsisWidth && len-- > 0) {
                str = str.substring(0, len);
                width = c.measureText(str).width;
            }
            return str + ellipsis;
        }
    }

})();