-- CreateTable
CREATE TABLE "ProjetoUserAllowedTheme" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "projetoId" INTEGER NOT NULL,
    "themeName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjetoUserAllowedTheme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjetoUserAllowedTheme_userId_projetoId_themeName_key" ON "ProjetoUserAllowedTheme"("userId", "projetoId", "themeName");

-- AddForeignKey
ALTER TABLE "ProjetoUserAllowedTheme" ADD CONSTRAINT "ProjetoUserAllowedTheme_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjetoUserAllowedTheme" ADD CONSTRAINT "ProjetoUserAllowedTheme_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
